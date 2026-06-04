import re

with open("client/src/components/StudentConsole.jsx", "r") as f:
    content = f.read()

# Add import
if "StudentGPSAttendance" not in content:
    content = content.replace(
        "import { verifyTokenSignature, calculateGeodistance } from '../services/crypto';",
        "import { verifyTokenSignature, calculateGeodistance } from '../services/crypto';\nimport StudentGPSAttendance from './StudentGPSAttendance';"
    )

# Replace the Anti-Cheat and Blueprint Map cards with StudentGPSAttendance
# They are between {/* Anti-cheat Proximity Sign-in */} and {/* Verification Logs list */}
pattern = re.compile(r'\{\/\* Anti-cheat Proximity Sign-in \*\/\}.*?\{\/\* Verification Logs list \*\/\}', re.DOTALL)
replacement = """{/* Smart GPS Attendance Widget */}
            <StudentGPSAttendance 
              currentUser={currentUser}
              courses={courses}
              schedules={schedules}
              pushNotification={pushNotification}
            />

          </div>

          {/* Verification Logs list */}"""

if pattern.search(content):
    content = pattern.sub(replacement, content)
else:
    print("Pattern not found!")

with open("client/src/components/StudentConsole.jsx", "w") as f:
    f.write(content)
