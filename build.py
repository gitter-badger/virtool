import sys
import os
import shutil
import subprocess

try:
    target = sys.argv[1]
except IndexError:
    target = "../virtool-build"

try:
    shutil.rmtree(target)
except OSError:
    pass

pyinstaller_cmd = [
    "pyinstaller",
    "-F",
    "--distpath", target,
    "run.py"
]

subprocess.call(pyinstaller_cmd)

shutil.rmtree("./build")
os.remove("run.spec")

version_info = subprocess.check_output(['git', 'describe']).decode().rstrip()

with open(os.path.join(target, "VERSION"), "w") as version_file:
    version_file.write(version_info)

shutil.copy("install.sh", os.path.join(target, "install.sh"))

shutil.copytree("assets", os.path.join(target, "assets"))

shutil.copytree("client/dist", os.path.join(target, "client"))
