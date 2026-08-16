WINDOWS SECURITY AUDIT + MALWARE / SPYWARE REMEDIATION

You are working on a Windows PC whose owner has explicitly authorized a full security audit and remediation.

The machine is exhibiting suspicious runtime behavior, including intermittent network connectivity, unexpected processes, possible permission changes, possible application/activity monitoring, account synchronization concerns, and potentially unwanted third-party software.

Your job is to determine what is actually happening from evidence, remove confirmed malicious or unwanted software, repair unsafe configuration, and leave the machine in a stable and documented state.

HIGHEST PRIORITY RULE

DO NOT blindly delete files, DLLs, services, registry entries, drivers, scheduled tasks, browser data, or Windows components merely because they appear unusual.

For every suspicious item:

1. Identify it.
2. Find its executable/file path.
3. Determine its publisher/signature.
4. Determine what launched it.
5. Determine whether Windows or installed legitimate software requires it.
6. Record its hash when applicable.
7. Determine what persistence mechanism it uses.
8. Classify it as:
   - Windows/system
   - OEM/hardware
   - legitimate third-party
   - unnecessary but benign
   - potentially unwanted
   - suspicious
   - confirmed malicious

Only remove or disable items after establishing that they are unnecessary, unwanted, unsafe, or malicious.

Never remove critical Windows services or system DLLs.

---

PHASE 1 — PRESERVE EVIDENCE

Before modifying anything, create:

"C:\SecurityAudit\"

Create timestamped files containing the current system state.

Collect:

- Windows edition/version/build
- hostname
- currently logged-in users
- local users
- local administrators
- Microsoft/Entra/domain/device enrollment state
- UAC configuration
- Windows Defender configuration
- installed antivirus/security products
- Windows Firewall state
- network adapters
- IP addresses
- gateways
- DNS servers
- routes
- Wi-Fi configuration
- proxy configuration
- WinHTTP proxy
- VPN adapters
- installed applications
- running processes
- services
- drivers
- startup programs
- scheduled tasks
- listening ports
- established outbound connections

Save this baseline before remediation.

---

PHASE 2 — PROCESS AUDIT

Enumerate every running process.

For each process collect where available:

- PID
- parent PID
- parent process
- executable path
- command line
- user/session
- company/publisher
- Authenticode signature status
- SHA-256 hash
- creation time
- network connections
- associated service

Pay particular attention to processes:

- running from "%TEMP%"
- running from "%APPDATA%"
- running from "%LOCALAPPDATA%"
- running from Downloads
- running from unusual user-writeable directories
- using randomly generated names
- unsigned binaries masquerading as Microsoft components
- executable names resembling Windows processes but residing outside normal Windows directories
- processes with strange parent/child relationships
- processes repeatedly restarting
- processes creating network connections at the time connectivity drops

Do NOT assume an unfamiliar process is malware.

Build a table of suspicious findings.

---

PHASE 3 — DLL / EXECUTABLE AUDIT

Audit suspicious DLLs and executables.

Check:

- executable path
- DLL path
- Authenticode signature
- publisher
- SHA-256 hash
- creation/modification timestamps
- associated process
- associated service
- associated scheduled task
- registry persistence
- startup persistence

Look specifically for:

- DLL sideloading indicators
- unsigned DLLs loaded into trusted applications
- executables pretending to be Windows components
- suspicious binaries inside writable folders
- unexpected DLLs injected or loaded into browsers
- suspicious shell extensions
- suspicious browser helper objects

Do NOT recursively delete unsigned DLLs.

Unsigned does NOT automatically mean malicious.

---

PHASE 4 — WINDOWS PERSISTENCE AUDIT

Inspect major Windows persistence mechanisms.

Audit:

Startup

- Startup folders
- HKCU Run
- HKCU RunOnce
- HKLM Run
- HKLM RunOnce
- StartupApproved entries

Scheduled Tasks

Inspect all scheduled tasks.

Flag tasks that:

- execute from user-writable directories
- run PowerShell with encoded commands
- launch scripts from TEMP/AppData
- have random names
- repeatedly execute every few minutes
- launch unknown binaries
- trigger on logon/network events unexpectedly

Services

Audit all Windows services.

Collect:

- name
- display name
- status
- startup type
- binary path
- account
- publisher/signature where applicable

Identify:

- orphaned services
- third-party remote administration services
- monitoring software
- unused vendor telemetry
- suspicious auto-start services
- services pointing to missing binaries
- services running binaries from unusual locations

Do NOT disable Microsoft services simply to reduce service count.

Disable only services confirmed unnecessary or unwanted.

Drivers

Audit installed kernel drivers.

Flag:

- unsigned drivers
- unknown third-party filter drivers
- network filter drivers
- filesystem filter drivers
- keyboard/input filter drivers
- screen capture/display hooks
- drivers installed by unknown software

Do not remove hardware drivers without identifying their purpose.

---

PHASE 5 — ADVANCED PERSISTENCE LOCATIONS

Inspect:

- WMI permanent event subscriptions
- Winlogon Shell
- Winlogon Userinit
- Image File Execution Options
- SilentProcessExit
- AppInit_DLLs
- AppCertDlls
- LSA authentication packages
- Security Support Providers
- Credential Providers
- Explorer shell extensions
- COM hijacking indicators
- unusual protocol handlers
- PowerShell profiles
- login scripts
- Group Policy startup/logon scripts

Report anything deviating from normal Windows configuration.

Do NOT modify these mechanisms without verifying the entry first.

---

PHASE 6 — PERMISSION / OWNERSHIP AUDIT

Investigate anything capable of changing permissions.

Check:

- local Administrators group
- Remote Desktop Users
- Remote Management Users
- ownership of sensitive directories
- unusual ACL entries
- scheduled tasks running SYSTEM
- services running SYSTEM
- applications with elevated privileges
- local security policy
- User Rights Assignment
- UAC settings
- registry permissions on important startup/persistence locations

Investigate unexplained changes to:

- file permissions
- directory permissions
- registry ACLs
- user privileges
- administrative group membership

Do NOT mass-reset NTFS permissions.

---

PHASE 7 — REMOTE ACCESS AUDIT

Identify software or configuration that could permit remote observation/control.

Look for:

- AnyDesk
- TeamViewer
- RustDesk
- Chrome Remote Desktop
- RemotePC
- Splashtop
- ScreenConnect / ConnectWise
- LogMeIn
- GoTo
- VNC variants
- RDP wrappers
- remote support agents
- remote monitoring/management software
- hidden remote-control services
- SSH servers
- WinRM
- PowerShell remoting
- unexpected RDP configuration

Also inspect:

- listening ports
- firewall rules
- port forwarding indicators available locally
- remote desktop configuration
- current remote sessions
- SMB shares

Distinguish legitimate remote-support software from unauthorized software.

---

PHASE 8 — ACTIVITY MONITORING / SPYWARE AUDIT

Look for software capable of recording or monitoring:

- keystrokes
- screenshots
- clipboard
- browser activity
- application usage
- webcam
- microphone
- filesystem activity
- network activity
- user login/activity history

Inspect installed apps, services, scheduled tasks, browser extensions, drivers, startup items, and directories associated with:

- parental-control software
- employee-monitoring software
- activity trackers
- keyloggers
- screenshot utilities
- hidden remote administration tools

Do not label normal Windows telemetry as spyware without evidence.

---

PHASE 9 — NETWORK MANIPULATION AUDIT

Because this system repeatedly loses connectivity while other devices remain connected, thoroughly inspect the Windows networking stack.

Check:

- Wi-Fi adapter state
- adapter event logs
- driver resets
- DHCP lease behavior
- DNS settings
- DNS changes
- static DNS configuration
- route table
- default gateway
- interface metrics
- Windows Filtering Platform events
- firewall rules
- proxy settings
- WinHTTP proxy
- VPN clients
- virtual adapters
- packet filtering software
- DNS filtering software
- antivirus web filters
- third-party network filter drivers
- NDIS filter drivers

Look for software or scheduled tasks that repeatedly:

- disable/enable the adapter
- renew DHCP
- change DNS
- change routes
- change proxy configuration
- restart network services
- alter firewall rules

Correlate network disconnect timestamps with:

- Windows System log
- WLAN AutoConfig log
- DHCP events
- DNS events
- NDIS/network-driver events
- process creation
- service starts/stops
- scheduled task execution

Determine the most probable cause of the repeated disconnections.

---

PHASE 10 — BROWSER AUDIT

Audit installed browsers, especially Chrome and Edge.

Inspect:

- extensions
- extension install source
- enterprise policies
- browser policies
- proxy configuration
- notification permissions
- site permissions
- background applications
- startup behavior
- search engine configuration
- homepage configuration
- installed PWAs
- suspicious extension directories

Flag extensions capable of:

- reading browsing history
- reading/changing webpage contents
- intercepting downloads
- modifying proxy configuration
- controlling browser settings

Do not access saved passwords or expose authentication secrets.

---

PHASE 11 — GOOGLE ACCOUNT / SYNC INVESTIGATION

Do NOT attempt to obtain passwords, authentication tokens, cookies, or bypass account security.

Audit what can legitimately be determined from the logged-in browser and Windows configuration.

Determine:

- which Google accounts are signed into Chrome
- whether Chrome Sync is enabled
- which categories are syncing
- whether multiple Chrome profiles exist
- whether extensions are synchronized
- whether browsing history is synchronized
- whether passwords are synchronized
- whether settings are synchronized
- whether open tabs are synchronized
- whether Google Drive/Desktop is installed
- whether Google Drive synchronization is active
- which local folders are being synchronized
- whether Google Photos or other Google software is syncing files
- whether browser profiles appear managed by policy

Where possible, guide the owner through reviewing Google account:

- Security
- Your devices
- Recent security activity
- Third-party connections
- Apps with account access
- Chrome Sync
- Passkeys
- Recovery methods

Do NOT revoke sessions or disconnect devices without the owner's explicit approval.

Document anything that could explain files, browser settings, extensions, or activity propagating between devices.

---

PHASE 12 — MICROSOFT / WINDOWS SYNC

Inspect:

- Microsoft account status
- OneDrive
- OneDrive folder backup
- Windows Backup
- Edge Sync
- Microsoft account connected devices
- Shared experiences
- Nearby Sharing
- Phone Link
- Windows device synchronization
- Office synchronization

Determine whether desktop/documents/pictures or settings are being synchronized between devices.

---

PHASE 13 — MALWARE SCANNING

Check Windows Defender health first.

Update Defender signatures if Windows Update/Defender functionality is healthy.

Run:

1. Windows Defender Quick Scan
2. Windows Defender Full Scan

If evidence warrants it, run Microsoft Defender Offline Scan only after preserving findings and warning the owner that the system will reboot.

Review Defender detection history.

Do not install random "PC cleaner" or antivirus utilities.

---

PHASE 14 — REMEDIATION

After completing the evidence-gathering phases, remediate confirmed issues.

For malicious or unwanted applications:

1. Stop associated processes.
2. Disable persistence.
3. Uninstall using the application's supported uninstall method when possible.
4. Remove abandoned scheduled tasks/services.
5. Quarantine remaining malicious artifacts.
6. Remove confirmed malicious files only after recording hashes/paths.
7. Repair browser configuration.
8. Repair proxy/DNS/network configuration if altered.
9. Restore appropriate firewall settings.
10. Remove confirmed malicious browser extensions.
11. Remove unauthorized remote-access software.
12. Reboot when necessary.

Before deleting something ambiguous, quarantine it rather than permanently deleting it.

Use:

"C:\SecurityAudit\Quarantine\"

where practical.

Do NOT move Windows-protected operating-system files into quarantine.

---

PHASE 15 — SERVICE CLEANUP

After malware remediation, identify unnecessary third-party auto-start services.

Create three groups:

KEEP

Required Windows, hardware, security, or actively used application services.

OPTIONAL

Legitimate services not needed at startup.

REMOVE/DISABLE

Orphaned, malicious, unwanted, or clearly unnecessary services.

Do not disable services merely to optimize Windows.

Reliability is more important than reducing process count.

---

PHASE 16 — REBOOT + VERIFY

Reboot the system after safe remediation.

Then repeat:

- running-process inventory
- service inventory
- scheduled tasks
- startup programs
- active network connections
- DNS configuration
- proxy configuration
- network adapters
- firewall state
- Defender status
- remote-access audit
- suspicious persistence locations

Confirm removed software has not recreated itself.

---

PHASE 17 — NETWORK STABILITY TEST

After remediation, continuously test:

- loopback
- default gateway
- public IP connectivity
- DNS resolution

Determine whether the recurring network disconnect remains.

If it still occurs, correlate the exact timestamps with Windows networking event logs and identify whether the failure occurs at:

1. Wi-Fi association
2. network adapter/driver
3. DHCP
4. routing
5. DNS
6. proxy/VPN/filter layer
7. application layer

---

FINAL REPORT

Create:

"C:\SecurityAudit\FINAL-SECURITY-REPORT.md"

Include:

Executive Summary

What was found and whether there is evidence of malware, spyware, unauthorized remote access, account synchronization, or configuration problems.

Confirmed Threats

For each:

- name
- path
- publisher
- hash
- persistence mechanism
- behavior
- remediation performed

Suspicious but Unconfirmed

Explain why each item is suspicious and what further evidence would be required.

Legitimate Items Initially Investigated

Record unusual-looking components that were verified as legitimate.

Services Changed

Every service disabled/removed and why.

Scheduled Tasks Changed

Every task changed and why.

Startup Items Changed

Every startup item changed and why.

Browser Changes

Extensions, policies, proxy, settings, and synchronization findings.

Google / Account Sync Findings

Explain any synchronization behavior capable of producing the symptoms described.

Do not record passwords, cookies, authentication tokens, or other secrets.

Permission Findings

Document unexpected administrators, ACL modifications, elevated processes, policies, or configuration.

Remote Access Findings

Document any remote administration capability discovered.

Network Findings

Document the cause—or most likely cause—of the periodic network disconnection.

Include exact supporting Windows event timestamps wherever possible.

Remaining Risks

Anything requiring further investigation.

Current Security State

State whether the computer appears:

- CLEAN
- CLEAN WITH CONFIGURATION ISSUES
- POTENTIALLY COMPROMISED
- CONFIRMED COMPROMISED

Do not claim compromise without evidence.

---

IMPORTANT OPERATING RULES

- Work autonomously through the complete audit.
- Do not stop simply because one suspicious process is found.
- Follow evidence across parent processes, services, tasks, DLLs, registry entries, drivers, network connections, browser configuration, and account synchronization.
- Prefer native Windows tooling and Microsoft Defender.
- Never expose credentials or authentication tokens.
- Never weaken Defender, firewall, UAC, Secure Boot, or other security mechanisms to make the investigation easier.
- Never delete unknown Windows DLLs.
- Never disable critical Windows services.
- Preserve evidence before changing configuration.
- Make the smallest defensible change necessary.
- Verify every remediation afterward.
- Keep detailed logs of every command and every change.

The objective is not simply to "make suspicious things disappear."

The objective is to determine why this computer is behaving this way, remove anything genuinely malicious or unauthorized, identify legitimate synchronization or management mechanisms that could explain the behavior, restore secure Windows configuration, and provide evidence supporting every conclusion.
