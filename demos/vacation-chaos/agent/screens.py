from pathlib import Path

from playwright.sync_api import sync_playwright

import config
from output import say
from show_api import call

OUT = Path(__file__).parent.parent / "docs" / "screens"
SIZES = {"site": (1440, 1000), "control": (1920, 1080), "vote": (390, 844)}
EXTRAS = [("egg-duck", "Easter egg: the duck peeks in", "site-hotels"), ("over-budget", "Over budget: account owner approval", "checkout-captcha")]


def presenter(settings: config.Settings, action: str, body: dict) -> dict:
    return call(settings, f"/api/presenter/{action}", body)


def kind(path: str) -> str:
    if path.startswith("/site"):
        return "site"
    return "control" if path == "/control" else "vote"


def shoot(page, settings: config.Settings, name: str, path: str) -> None:
    w, h = SIZES[kind(path)]
    page.set_viewport_size({"width": w, "height": h})
    page.goto(f"{settings.show_url}{path}{'?mirror=1' if kind(path) == 'site' else ''}")
    page.wait_for_timeout(1800 if kind(path) == "control" else 700)
    page.screenshot(path=str(OUT / f"{name}.png"))


def extras(page, settings: config.Settings) -> None:
    presenter(settings, "scenario", {"name": "site-hotels"})
    page.set_viewport_size({"width": 1440, "height": 900})
    page.goto(f"{settings.show_url}/site/hotels?mirror=1")
    page.add_style_tag(content=".duck{animation:none!important;transform:translate(12px,-14px) rotate(16deg)!important}")
    page.wait_for_timeout(500)
    page.screenshot(path=str(OUT / "egg-duck.png"))
    presenter(settings, "scenario", {"name": "checkout-captcha"})
    presenter(settings, "captcha", {})
    page.goto(f"{settings.show_url}/site/checkout")
    page.click("text=Pay now")
    page.wait_for_timeout(800)
    page.screenshot(path=str(OUT / "over-budget.png"))


def gallery(shots: list[tuple[str, str]]) -> None:
    cards = "".join(f'<figure><a href="{n}.png"><img src="{n}.png" loading="lazy"></a><figcaption>{label}</figcaption></figure>' for n, label in shots)
    style = ("body{font-family:-apple-system,system-ui,sans-serif;background:#fafafa;color:#09090b;margin:0;padding:32px}"
             "h1{font-size:20px;margin:0 0 20px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:20px}"
             "figure{margin:0;background:#fff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden}"
             "img{width:100%;display:block;border-bottom:1px solid #e4e4e7}figcaption{padding:10px 14px;font-size:14px;font-weight:500}")
    html = f"<!doctype html><meta charset=utf-8><title>Vacation Chaos screens</title><style>{style}</style><h1>Vacation Chaos: every scenario</h1><main>{cards}</main>"
    (OUT / "index.html").write_text(html)


def phone_voted(page, settings: config.Settings) -> tuple[str, str]:
    presenter(settings, "scenario", {"name": "phone-vote"})
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(f"{settings.show_url}/vote")
    page.wait_for_timeout(1200)
    page.click("button[data-id]")
    page.wait_for_timeout(1500)
    page.screenshot(path=str(OUT / "phone-voted.png"))
    return ("phone-voted", "Phone: after voting")


def shoot_all(page, settings: config.Settings) -> list[tuple[str, str]]:
    shots = []
    for name, item in presenter(settings, "scenario-list", {})["result"].items():
        presenter(settings, "scenario", {"name": name})
        shoot(page, settings, name, item["path"])
        shots.append((name, item["label"]))
        say(f"shot {name}")
    shots.append(phone_voted(page, settings))
    extras(page, settings)
    return shots + [(n, label) for n, label, _ in EXTRAS]


def main() -> None:
    settings = config.load()
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        shots = shoot_all(p.chromium.launch().new_page(), settings)
    presenter(settings, "reset", {})
    gallery(shots)
    say(f"Gallery: {OUT / 'index.html'}")


if __name__ == "__main__":
    main()
