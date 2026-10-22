@echo off
REM Windows: sync current season from NBA.com and push (Vercel redeploys).
REM Schedule daily with Task Scheduler pointing at this file.
cd /d "%~dp0.."
git pull --rebase --autostash -q
py -m pip install -q -r sync\requirements.txt
py sync\sync_nba.py --push %*
