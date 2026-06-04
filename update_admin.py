import re

with open("client/src/components/AdminConsole.jsx", "r") as f:
    content = f.read()

# Add import
if "AdminGPSAttendanceAudit" not in content:
    content = content.replace(
        "import { \n  UserPlus",
        "import AdminGPSAttendanceAudit from './AdminGPSAttendanceAudit';\nimport { \n  UserPlus"
    )
    # in case UserPlus is not there, just put it at the top
    if "AdminGPSAttendanceAudit" not in content:
        content = content.replace(
            "import React, { useState } from 'react';",
            "import React, { useState } from 'react';\nimport AdminGPSAttendanceAudit from './AdminGPSAttendanceAudit';"
        )

# Add subnav button
subnav_pattern = r'<button className={`qclay-subnav-item \$\{adminTab === \'audit\' \? \'active\' : \'\'\}`} onClick=\{\(\) => setAdminTab\(\'audit\'\)\}>\s*<Lock size=\{14\} aria-hidden="true" \/> System Audit Trails\s*<\/button>'
subnav_replacement = """<button className={`qclay-subnav-item ${adminTab === 'audit' ? 'active' : ''}`} onClick={() => setAdminTab('audit')}>
          <Lock size={14} aria-hidden="true" /> System Audit Trails
        </button>
        <button className={`qclay-subnav-item ${adminTab === 'gps-audit' ? 'active' : ''}`} onClick={() => setAdminTab('gps-audit')}>
          <MapPin size={14} aria-hidden="true" /> GPS Attendance Audit
        </button>"""

if "gps-audit" not in content:
    content = re.sub(subnav_pattern, subnav_replacement, content)

# Add the new tab panel at the end, right before the last </div>
tab_panel = """
      {/* Tab 7: GPS Attendance Audit */}
      {adminTab === 'gps-audit' && (
        <AdminGPSAttendanceAudit currentUser={currentUser} />
      )}
    </div>
  );
}"""

content = re.sub(r'    </div>\s*<div style=\{\{ clear: \'both\' \}\}>\s*<\/div>\s*<\/div>\s*\);\s*\}|    </div>\s*\);\s*\}', tab_panel, content)

with open("client/src/components/AdminConsole.jsx", "w") as f:
    f.write(content)
