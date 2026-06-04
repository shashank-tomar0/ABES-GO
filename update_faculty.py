import re

with open("client/src/components/FacultyConsole.jsx", "r") as f:
    content = f.read()

# Add import
if "FacultyGPSAttendance" not in content:
    content = content.replace(
        "import { generateTokenSignature } from '../services/crypto';",
        "import { generateTokenSignature } from '../services/crypto';\nimport FacultyGPSAttendance from './FacultyGPSAttendance';"
    )

# Rename tab 'qr' to 'attendance'
content = content.replace("facultyTab === 'qr'", "facultyTab === 'attendance'")
content = content.replace("setFacultyTab('qr')", "setFacultyTab('attendance')")
content = content.replace("Dynamic QR Broadcast", "Smart GPS Attendance")

# Replace the QR tab content with FacultyGPSAttendance
# The QR tab starts with {/* Faculty Tab 3: QR Broadcast */} and ends right before {/* Faculty Tab 4: Internal Marks Portal */}
# We can use regex to replace it
pattern = re.compile(r'\{\/\* Faculty Tab 3: QR Broadcast \*\/\}.*?\{\/\* Faculty Tab 4: Internal Marks Portal \*\/\}', re.DOTALL)
replacement = """{/* Faculty Tab 3: GPS Attendance */}
      {facultyTab === 'attendance' && (
        <FacultyGPSAttendance 
          currentUser={currentUser}
          courses={courses}
          schedules={schedules}
          pushNotification={pushNotification}
        />
      )}

      {/* Faculty Tab 4: Internal Marks Portal */}"""

if pattern.search(content):
    content = pattern.sub(replacement, content)

with open("client/src/components/FacultyConsole.jsx", "w") as f:
    f.write(content)
