import os
import re

directory = "client/src"

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith((".jsx", ".js")):
            filepath = os.path.join(root, file)
            with open(filepath, "r") as f:
                content = f.read()
                
            # Replace 'http://localhost:3001/api/...' with `${import.meta.env.VITE_API_URL}/...`
            # For template literals like `http://localhost:3001/api/...`
            new_content = re.sub(
                r'`http://localhost:3001/api(/.*?)`',
                r'`${import.meta.env.VITE_API_URL}\1`',
                content
            )
            # For `http://localhost:3001${endpoint}`
            new_content = re.sub(
                r'`http://localhost:3001(.*?)`',
                r'`${import.meta.env.VITE_API_URL.replace("/api", "")}\1`',
                new_content
            )
            # For string literals like 'http://localhost:3001/api/...'
            new_content = re.sub(
                r"'http://localhost:3001/api(.*?)'",
                r'`${import.meta.env.VITE_API_URL}\1`',
                new_content
            )
            # For App.jsx base url
            new_content = new_content.replace(
                "'http://localhost:3001/api'", 
                "import.meta.env.VITE_API_URL"
            )
            
            # WebSocket replace
            new_content = new_content.replace(
                "ws://localhost:3001",
                "${import.meta.env.VITE_API_URL.replace('http', 'ws').replace('/api', '')}"
            )

            if new_content != content:
                with open(filepath, "w") as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
