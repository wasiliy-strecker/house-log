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
        if label.casefold() in ((node.get("text") or "").casefold(), (node.get("content-desc") or "").casefold()):
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
    tap("Neue Akte anlegen")
    name = "Android-Testhaus-" + str(int(time.time()))
    enter("Name *", name)
    enter("Standort / Adresse", "Synthetischer Testort")
    tap("Akte anlegen", scroll=True)
    wait_for(name)
    tap("Eintrag erfassen")
    tap("Wartung")
    enter("Kosten in Euro", "123,45")
    enter("Handwerker / Dienstleister", "Testbetrieb")
    enter("Notiz", "Synthetischer UI-Test")
    tap("Eintrag speichern", scroll=True)
    wait_for("123,45 €")
    tap("Bearbeiten / Anhänge", scroll=True)
    tap("Galerie auswählen", scroll=True)
    command("shell", "input", "keyevent", "4")
    tap("Eintrag speichern", scroll=True) if find("Eintrag speichern") else tap("Änderungen speichern", scroll=True)
    wait_for("123,45 €")
    tap("Gesamtprotokoll erstellen", scroll=True)
    tap("Kompakt ohne Anhänge")
    wait_for("Protokoll gespeichert. Es bleibt bei späteren Änderungen unverändert.")
    print(f"BESTANDEN: Akte {name}, Kosten, Eintrag, Bearbeiten, Galerieabbruch, Protokoll.")
