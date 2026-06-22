@echo off
cd /d "C:\Users\Admin\Desktop\Ai\mood saas\mood-studio"
del /q extract_compare.py extract_compare.ps1 test_parse.ps1 test_parse.cmd cd_run.cmd run_both.cmd run_basic.cmd run_agentic.cmd cmp_basic.err cmp_agentic.err cmp_basic.done cmp_agentic.done 2>nul
echo cleanup done
dir /b cmp_*.json
