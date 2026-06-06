#!/usr/bin/env python3
"""
File Analyzer for Batches 21-25
Analyzes React components (auth, calendar, contracts) and outputs to JSON
Vietnamese language output
"""

import os
import json
import re
from pathlib import Path
from typing import Dict, List, Any, Optional

ROOT_DIR = Path("C:/Users/Admin/Desktop/Ai/mood saas/mood-studio")
COMPONENTS_DIR = ROOT_DIR / "components"

def extract_imports(content: str) -> List[str]:
    """Extract all import statements"""
    import_pattern = r'import\s+(?:{[^}]+}|[\w*]+)?\s*(?:,\s*{[^}]+})?\s*from\s+["\']([^"\']+)["\']'
    imports = re.findall(import_pattern, content)
    return [imp for imp in imports if imp]

def extract_component_name(filepath: Path, content: str) -> str:
    """Extract main component/function name"""
    # Try default export
    default_export = re.search(r'export\s+default\s+(?:function\s+)?(\w+)', content)
    if default_export:
        return default_export.group(1)

    # Try named export matching filename
    filename = filepath.stem.replace('-', '').replace('_', '').lower()
    named_exports = re.findall(r'export\s+(?:const|function)\s+(\w+)', content)
    for name in named_exports:
        if name.lower().replace('_', '') == filename:
            return name

    # Return first named export
    if named_exports:
        return named_exports[0]

    return filepath.stem

def extract_props(content: str) -> Optional[Dict[str, Any]]:
    """Extract component props interface/type"""
    # Find Props interface or type
    props_pattern = r'(?:interface|type)\s+(\w*Props)\s*(?:extends\s+[^{]+)?\s*{([^}]+)}'
    match = re.search(props_pattern, content, re.DOTALL)

    if not match:
        return None

    interface_name = match.group(1)
    props_body = match.group(2)

    # Extract individual props
    prop_lines = [line.strip() for line in props_body.split('\n') if line.strip() and not line.strip().startswith('//')]

    props = {}
    for line in prop_lines:
        # Parse prop line: name?: type;
        prop_match = re.match(r'(\w+)(\?)?:\s*([^;]+)', line)
        if prop_match:
            name, optional, prop_type = prop_match.groups()
            props[name] = {
                "type": prop_type.strip(),
                "required": optional != '?'
            }

    return {
        "interface": interface_name,
        "props": props
    }

def extract_hooks(content: str) -> List[str]:
    """Extract React hooks usage"""
    hook_pattern = r'(?:const|let)\s+(?:\[?[\w,\s]+\]?)\s*=\s*(use[\w]+)\('
    hooks = re.findall(hook_pattern, content)

    # Also check direct hook calls
    direct_hooks = re.findall(r'\b(use[\w]+)\s*\(', content)

    all_hooks = list(set(hooks + direct_hooks))
    return sorted(all_hooks)

def extract_state_variables(content: str) -> List[str]:
    """Extract useState variable names"""
    state_pattern = r'const\s+\[(\w+),\s*set\w+\]\s*=\s*useState'
    states = re.findall(state_pattern, content)
    return states

def extract_exported_items(content: str) -> List[str]:
    """Extract all exported items"""
    exports = []

    # Default export
    default = re.search(r'export\s+default\s+(?:function\s+)?(\w+)', content)
    if default:
        exports.append(f"default:{default.group(1)}")

    # Named exports
    named = re.findall(r'export\s+(?:const|function|class|interface|type)\s+(\w+)', content)
    exports.extend(named)

    # Export statements
    export_stmt = re.findall(r'export\s+{\s*([^}]+)\s*}', content)
    for stmt in export_stmt:
        items = [item.strip() for item in stmt.split(',')]
        exports.extend(items)

    return list(set(exports))

def count_lines_of_code(content: str) -> int:
    """Count non-empty, non-comment lines"""
    lines = content.split('\n')
    code_lines = [line for line in lines if line.strip() and not line.strip().startswith('//') and not line.strip().startswith('*')]
    return len(code_lines)

def extract_component_hierarchy(content: str) -> Dict[str, Any]:
    """Extract component structure and JSX hierarchy"""
    # Find main component return statement
    return_match = re.search(r'return\s*\(?\s*<([^>\s]+)', content, re.DOTALL)
    root_element = return_match.group(1) if return_match else None

    # Find all JSX elements used
    jsx_elements = re.findall(r'<([A-Z][\w.]+)', content)
    jsx_elements = list(set(jsx_elements))

    # Find custom components (capitalized)
    custom_components = [el for el in jsx_elements if el[0].isupper() and '.' not in el]

    return {
        "root_element": root_element,
        "custom_components": sorted(custom_components),
        "total_jsx_elements": len(jsx_elements)
    }

def analyze_file(filepath: Path) -> Dict[str, Any]:
    """Analyze a single TypeScript/JavaScript file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        component_name = extract_component_name(filepath, content)
        props_info = extract_props(content)
        hooks = extract_hooks(content)
        states = extract_state_variables(content)
        exports = extract_exported_items(content)
        hierarchy = extract_component_hierarchy(content)
        loc = count_lines_of_code(content)
        imports = extract_imports(content)

        # Categorize imports
        internal_imports = [imp for imp in imports if imp.startswith('@/') or imp.startswith('.')]
        external_imports = [imp for imp in imports if not imp.startswith('@/') and not imp.startswith('.')]

        # Check component type
        is_client = '"use client"' in content or "'use client'" in content
        is_server = '"use server"' in content or "'use server'" in content

        # Check for API calls
        has_fetch = 'fetch(' in content
        has_actions = any('action' in imp.lower() for imp in imports)

        relative_path = str(filepath.relative_to(ROOT_DIR)).replace('\\', '/')

        return {
            "file": relative_path,
            "filename": filepath.name,
            "component_name": component_name,
            "type": "client" if is_client else ("server" if is_server else "universal"),
            "loc": loc,
            "props": props_info,
            "hooks": hooks,
            "state_variables": states,
            "hierarchy": hierarchy,
            "imports": {
                "internal": internal_imports[:10],  # Limit for brevity
                "external": external_imports[:10],
                "total_internal": len(internal_imports),
                "total_external": len(external_imports)
            },
            "exports": exports,
            "features": {
                "uses_fetch": has_fetch,
                "uses_actions": has_actions,
                "is_form": 'onSubmit' in content or 'handleSubmit' in content,
                "is_modal_drawer": 'Drawer' in content or 'Modal' in content,
                "is_table": 'Table' in content or 'TH' in content,
                "uses_realtime": 'useRealtime' in content,
                "uses_swr": 'useSWR' in content or 'useQuery' in content
            }
        }
    except Exception as e:
        return {
            "file": str(filepath.relative_to(ROOT_DIR)).replace('\\', '/'),
            "filename": filepath.name,
            "error": str(e)
        }

def collect_files(directory: Path, patterns: List[str]) -> List[Path]:
    """Collect all files matching patterns"""
    files = []
    for pattern in patterns:
        files.extend(directory.glob(pattern))
    return sorted(files, key=lambda p: str(p))

def main():
    """Main analysis function"""

    # Define file collections for each batch
    auth_files = list((COMPONENTS_DIR / "auth").glob("*.tsx"))
    calendar_files = list((COMPONENTS_DIR / "calendar").rglob("*.tsx"))
    contract_files = list((COMPONENTS_DIR / "contracts").rglob("*.tsx")) + \
                     list((COMPONENTS_DIR / "contracts").rglob("*.ts"))

    # Remove test files
    contract_files = [f for f in contract_files if '.test.' not in f.name and '.spec.' not in f.name]

    all_files = auth_files + calendar_files + contract_files
    total_files = len(all_files)

    print(f"Phát hiện {total_files} files:")
    print(f"  - Auth: {len(auth_files)}")
    print(f"  - Calendar: {len(calendar_files)}")
    print(f"  - Contracts: {len(contract_files)}")
    print()

    # Split into 5 batches (21-25)
    batch_size = (total_files + 4) // 5  # Ceiling division
    batches = {
        21: all_files[0:batch_size],
        22: all_files[batch_size:batch_size*2],
        23: all_files[batch_size*2:batch_size*3],
        24: all_files[batch_size*3:batch_size*4],
        25: all_files[batch_size*4:],
    }

    # Analyze each batch
    for batch_num, files in batches.items():
        print(f"Đang phân tích Batch {batch_num} ({len(files)} files)...")

        analyzed = []
        for i, filepath in enumerate(files, 1):
            print(f"  [{i}/{len(files)}] {filepath.relative_to(COMPONENTS_DIR)}")
            result = analyze_file(filepath)
            analyzed.append(result)

        # Calculate batch statistics
        total_loc = sum(item.get('loc', 0) for item in analyzed if 'error' not in item)
        total_components = len([item for item in analyzed if 'error' not in item])
        client_components = len([item for item in analyzed if item.get('type') == 'client'])

        # Create batch output
        output = {
            "batch": batch_num,
            "description": f"Components Batch {batch_num} - mood-studio project",
            "generated_at": "2026-05-28",
            "statistics": {
                "total_files": len(files),
                "total_components": total_components,
                "total_loc": total_loc,
                "client_components": client_components,
                "errors": len([item for item in analyzed if 'error' in item])
            },
            "files": analyzed
        }

        # Write to JSON
        output_file = ROOT_DIR / f"batch-{batch_num}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        print(f"✓ Batch {batch_num} hoàn thành: {output_file}")
        print(f"  Thống kê: {total_components} components, {total_loc} LOC\n")

    print("\n✅ Hoàn thành phân tích tất cả 5 batches (21-25)")
    print(f"Các file JSON đã được tạo tại: {ROOT_DIR}")

if __name__ == "__main__":
    main()
