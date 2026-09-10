# backup-install-task.ps1 — dang ky Task Scheduler chay backup-db.ps1 luc 02:00 moi dem
# Chay 1 lan: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\backup-install-task.ps1
# Go: schtasks /delete /tn MoodStudio-Backup-DB /f

$script = 'C:\Users\Admin\Desktop\Ai\mood saas\mood-studio\scripts\backup-db.ps1'
$name   = 'MoodStudio-Backup-DB'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Daily -At 02:00
$settings = New-ScheduledTaskSettingsSet -WakeToRun -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Description 'Mood Studio: pg_dump DB production ve H:\backups\mood-studio moi dem (chi doc)' -Force | Out-Null
Get-ScheduledTask -TaskName $name | Select-Object TaskName, State | Format-Table -AutoSize
Write-Output "Lan chay ke tiep: $((Get-ScheduledTaskInfo -TaskName $name).NextRunTime)"
