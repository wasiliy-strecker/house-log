#!/usr/bin/env python3
"""UI smoke test using synthetic data. Deliberately limited to an emulator."""

import os
from pathlib import Path
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

device = sys.argv[1] if len(sys.argv) > 1 else "emulator-5556"
if not device.startswith("emulator-"):
    raise SystemExit("Dieser synthetische UI-Test läuft ausschließlich im Emulator.")
sdk = os.environ.get("ANDROID_HOME", str(Path.home() / ".local/android-sdk"))
adb = str(Path(sdk) / "platform-tools/adb")
package = "com.appfactory.house_log.dev"


def command(*args):
    return subprocess.check_output([adb, "-s", device, *args], text=True)


def nodes():
    command("shell", "uiautomator", "dump", "/sdcard/hausakte-ui.xml")
    return list(ET.fromstring(command("shell", "cat", "/sdcard/hausakte-ui.xml")).iter("node"))


def find(label, field=False):
    for node in nodes():
        if field and node.get("class") != "android.widget.EditText":
            continue
        text = (node.get("text") or "").casefold()
        description = (node.get("content-desc") or "").casefold()
        if label.casefold() == text or label.casefold() == description or (not field and description.endswith(", " + label.casefold())):
            bounds = [int(x) for x in re.findall(r"\d+", node.get("bounds", ""))]
            if len(bounds) == 4 and bounds[3] > bounds[1]:
                return bounds
    return None


def tap(label, field=False, scroll=False):
    for _ in range(10 if scroll else 4):
        bounds = find(label, field)
        if bounds:
            command("shell", "input", "tap", str((bounds[0] + bounds[2]) // 2), str((bounds[1] + bounds[3]) // 2))
            time.sleep(0.3)
            return
        if scroll:
            command("shell", "input", "swipe", "600", "1550", "600", "480", "300")
        time.sleep(0.5)
    raise AssertionError(f"Bedienelement nicht gefunden: {label}")


def enter(label, value):
    tap(label, field=True, scroll=True)
    command("shell", "input", "text", value.replace(" ", "%s"))
    command("shell", "input", "keyevent", "4")


def wait_for(label):
    for _ in range(10):
        if find(label):
            return
        time.sleep(0.5)
    raise AssertionError(f"Ergebnis nicht sichtbar: {label}")


if __name__ == "__main__":
    if find("Abbrechen"):
        tap("Abbrechen")
    command("shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", "hausakte:///", package)
    tap("Akte anlegen")
    name = "Android-Testhaus-" + str(int(time.time()))
    enter("Name *", name)
    enter("Standort / Adresse (optional)", "Synthetischer Testort")
    tap("Akte speichern", scroll=True)
    wait_for(name)
    tap("Eintrag erfassen")
    tap("Ohne Foto erfassen")
    enter("Aktivität *", "Wartung")
    enter("Kosten (optional)", "123,45")
    enter("Handwerker / Dienstleister (optional)", "Testbetrieb")
    enter("Notiz", "Synthetischer UI-Test")
    tap("Eintrag speichern", scroll=True)
    wait_for("123,45 €")
    tap("Bearbeiten", scroll=True)
    tap("Fotos aus Galerie hinzufügen", scroll=True)
    wait_for("Photos")
    command("shell", "input", "keyevent", "4")
    tap("Eintrag speichern", scroll=True) if find("Eintrag speichern") else tap("Änderungen speichern", scroll=True)
    wait_for("123,45 €")
    tap("Hausprotokoll als PDF erstellen", scroll=True)
    tap("Kompakte PDF ohne Anhänge")
    wait_for("Drucken")
    wait_for("Teilen")
    print(f"BESTANDEN: Akte {name}, Kosten, Eintrag, Bearbeiten, Galerieabbruch, Protokoll.")
