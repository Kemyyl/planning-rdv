#!/bin/bash
# usage: shot.sh file.html W H
f=$1; w=$2; h=$3
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --allow-file-access-from-files --force-device-scale-factor=2 --window-size=$w,$h --screenshot="$(pwd)/${f%.html}.png" "file://$(pwd)/$f" >/dev/null 2>&1
echo "${f%.html}.png"
