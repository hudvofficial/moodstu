#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Batch Analyzer 26-30: Finance, CRM, Dashboard, Employees, Gallery Components
Phân tích các React components với focus vào hooks, data fetching, và patterns
"""

import json
import re
import os
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime

ROOT = Path("c:/Users/Admin/Desktop/Ai/mood saas/mood-studio")

# All target files sorted
ALL_FILES = [
    "components/contracts/detail/drive-gallery-block.tsx",
    "components/contracts/detail/financial-dashboard.tsx",
    "components/contracts/detail/gallery-grid.tsx",
    "components/contracts/detail/gallery-stats.tsx",
    "components/contracts/gallery/gallery-filter-modal.tsx",
    "components/contracts/gallery/gallery-full-page.tsx",
    "components/contracts/gallery/gallery-helpers.ts",
    "components/contracts/gallery/gallery-image-grid-index.tsx",
    "components/contracts/gallery/gallery-image-grid-pinterest.tsx",
    "components/contracts/gallery/gallery-image-grid.tsx",
    "components/contracts/gallery/gallery-image-list.tsx",
    "components/contracts/gallery/gallery-image-tile.tsx",
    "components/contracts/gallery/gallery-lightbox.tsx",
    "components/contracts/gallery/gallery-list-modal.tsx",
    "components/contracts/gallery/gallery-settings-modal.tsx",
    "components/contracts/gallery/gallery-sort-dropdown.tsx",
    "components/contracts/gallery/gallery-toolbar-actions.tsx",
    "components/contracts/gallery/gallery-toolbar-filters.tsx",
    "components/contracts/gallery/gallery-toolbar-stats.tsx",
    "components/contracts/gallery/gallery-toolbar.tsx",
    "components/contracts/gallery/share-gallery-modal.tsx",
    "components/contracts/gallery/tabs/gallery-filter-drive-tab.tsx",
    "components/contracts/gallery/use-gallery-data.ts",
    "components/contracts/gallery/use-masonry-grid-virtual.ts",
    "components/contracts/gallery/use-masonry-grid.ts",
    "components/contracts/gallery/use-masonry-pinterest.ts",
    "components/contracts/gallery/use-masonry-virtual.ts",
    "components/crm/call-prep-card.tsx",
    "components/crm/crm-dashboard-layout.tsx",
    "components/crm/crm-record-card.tsx",
    "components/crm/crm-subnav.tsx",
    "components/crm/crm-toolbar-surface.tsx",
    "components/crm/crm-view-switch.tsx",
    "components/crm/customer-card.tsx",
    "components/crm/customer-compact-card.tsx",
    "components/crm/customer-drawer.tsx",
    "components/crm/customer-filters.tsx",
    "components/crm/customer-form-modal.tsx",
    "components/crm/customer-list-client.tsx",
    "components/crm/customer-stats-bar.tsx",
    "components/crm/customers-table.tsx",
    "components/crm/detail/customer-detail-client.tsx",
    "components/crm/lead-card.tsx",
    "components/crm/lead-care-log.tsx",
    "components/crm/lead-compact-card.tsx",
    "components/crm/lead-detail-drawer.tsx",
    "components/crm/lead-filters.tsx",
    "components/crm/lead-form-modal.tsx",
    "components/crm/lead-list-page.tsx",
    "components/crm/lead-stats-bar.tsx",
    "components/crm/pipeline-board.tsx",
    "components/crm/risk-flags-badge.tsx",
    "components/crm/widgets/widget-cta.tsx",
    "components/crm/widgets/widget-sales-funnel.tsx",
    "components/crm/widgets/widget-source-donut.tsx",
    "components/crm/widgets/widget-upcoming.tsx",
    "components/dashboard/dashboard-realtime-refresh.tsx",
    "components/dashboard/payment-reminders.tsx",
    "components/dashboard/quick-access-grid.tsx",
    "components/dashboard/revenue-chart.tsx",
    "components/dashboard/service-pie-chart.tsx",
    "components/dashboard/upcoming-events.tsx",
    "components/employees/employee-card.tsx",
    "components/employees/employee-detail-drawer.tsx",
    "components/employees/employee-detail-page.tsx",
    "components/employees/employee-filters.tsx",
    "components/employees/employee-form-modal.tsx",
    "components/employees/employee-info-card.tsx",
    "components/employees/employee-list-page.tsx",
    "components/employees/employee-notes.tsx",
    "components/employees/employee-stats-bar.tsx",
    "components/employees/employee-table.tsx",
    "components/finance/budget/budget-client.tsx",
    "components/finance/budget/budget-form-modal.tsx",
    "components/finance/cashflow/ledger-client.tsx",
    "components/finance/cashflow/ledger-desktop-table.tsx",
    "components/finance/cashflow/ledger-mobile-list.tsx",
    "components/finance/categories/categories-client.tsx",
    "components/finance/categories/category-form-modal.tsx",
    "components/finance/closes/close-create-modal.tsx",
    "components/finance/closes/close-detail-client.tsx",
    "components/finance/closes/close-filters.tsx",
    "components/finance/closes/close-stats-bar.tsx",
    "components/finance/closes/closes-client.tsx",
    "components/finance/dashboard/advanced-kpi-grid.tsx",
    "components/finance/dashboard/aging-bars-chart.tsx",
    "components/finance/dashboard/break-even-card.tsx",
    "components/finance/dashboard/budget-vs-actual-list.tsx",
    "components/finance/dashboard/cashflow-runway-card.tsx",
    "components/finance/dashboard/customer-metrics-card.tsx",
    "components/finance/dashboard/dress-roi-card.tsx",
    "components/finance/dashboard/expense-donut-chart.tsx",
    "components/finance/dashboard/finance-compact-bar.tsx",
    "components/finance/dashboard/finance-dashboard-client.tsx",
    "components/finance/dashboard/finance-filters.tsx",
    "components/finance/dashboard/finance-intelligence-section.tsx",
    "components/finance/dashboard/finance-quick-nav.tsx",
    "components/finance/dashboard/forecast-chart.tsx",
    "components/finance/dashboard/health-score-card.tsx",
    "components/finance/dashboard/inventory-costs-card.tsx",
    "components/finance/dashboard/lazy-charts.tsx",
    "components/finance/dashboard/pending-collections.tsx",
    "components/finance/dashboard/profit-detail-drawer.tsx",
    "components/finance/dashboard/profit-report-table.tsx",
    "components/finance/dashboard/recent-transactions.tsx",
    "components/finance/dashboard/revenue-bar-chart.tsx",
    "components/finance/dashboard/revenue-breakdown-card.tsx",
    "components/finance/dashboard/scenario-planning-card.tsx",
    "components/finance/dashboard/service-donut-chart.tsx",
    "components/finance/dashboard/smart-dashboard-banner.tsx",
    "components/finance/dashboard/upcoming-contracts.tsx",
    "components/finance/debts/debt-aging-card.tsx",
    "components/finance/debts/debt-desktop-table.tsx",
    "components/finance/debts/debt-form-modal.tsx",
    "components/finance/debts/debt-history-drawer.tsx",
    "components/finance/debts/debt-mobile-list.tsx",
    "components/finance/debts/debt-mobile-swipe-card.tsx",
    "components/finance/debts/debt-payment-modal.tsx",
    "components/finance/debts/debt-qr-payment-modal.tsx",
    "components/finance/debts/debt-row-actions.tsx",
    "components/finance/debts/debt-stats-bar.tsx",
    "components/finance/debts/debts-client.tsx",
    "components/finance/expenses/expense-desktop-table.tsx",
    "components/finance/expenses/expense-detail-modal.tsx",
    "components/finance/expenses/expense-filters.tsx",
    "components/finance/expenses/expense-form-modal.tsx",
    "components/finance/expenses/expense-mobile-list.tsx",
    "components/finance/expenses/expense-mobile-swipe-card.tsx",
    "components/finance/expenses/expense-row-actions.tsx",
    "components/finance/expenses/expense-stats-bar.tsx",
    "components/finance/expenses/expenses-client.tsx",
    "components/finance/expenses/print-expense-client.tsx",
    "components/finance/finance-fab.tsx",
    "components/finance/finance-format.ts",
    "components/finance/fixed-costs/fixed-cost-form-modal.tsx",
    "components/finance/fixed-costs/fixed-costs-client.tsx",
    "components/finance/goals/goal-analytics.tsx",
    "components/finance/goals/goal-celebration-overlay.tsx",
    "components/finance/goals/goal-contribution-modal.tsx",
    "components/finance/goals/goal-detail-drawer.tsx",
    "components/finance/goals/goal-form-modal.tsx",
    "components/finance/goals/goal-visual.tsx",
    "components/finance/goals/goals-client.tsx",
    "components/finance/goals/goals-comparison.tsx",
    "components/finance/goals/goals-filters.tsx",
    "components/finance/goals/goals-overview.tsx",
    "components/finance/goals/goals-stats-bar.tsx",
    "components/finance/integrity/ghost-scan-widget.tsx",
    "components/finance/investments/investment-display.ts",
    "components/finance/investments/investment-filters.tsx",
    "components/finance/investments/investment-form-modal.tsx",
    "components/finance/investments/investment-mobile-list.tsx",
    "components/finance/investments/investment-stats-bar.tsx",
    "components/finance/investments/investments-client.tsx",
    "components/finance/lab-debts/lab-debts-client.tsx",
    "components/finance/receipts/print-receipt-client.tsx",
    "components/finance/receipts/receipt-desktop-table.tsx",
    "components/finance/receipts/receipt-detail-modal.tsx",
    "components/finance/receipts/receipt-filters.tsx",
    "components/finance/receipts/receipt-form-fields.tsx",
    "components/finance/receipts/receipt-form-modal.tsx",
    "components/finance/receipts/receipt-form-sale-section.tsx",
    "components/finance/receipts/receipt-mobile-list.tsx",
    "components/finance/receipts/receipt-mobile-swipe-card.tsx",
    "components/finance/receipts/receipt-qr-payment-modal.tsx",
    "components/finance/receipts/receipt-row-actions.tsx",
    "components/finance/receipts/receipt-stats-bar.tsx",
    "components/finance/receipts/receipts-client.tsx",
    "components/finance/receipts/sale-item-selector.tsx",
    "components/finance/salaries/payment-confirm-modal.tsx",
    "components/finance/salaries/payslip-modal.tsx",
    "components/finance/salaries/salaries-client.tsx",
    "components/finance/salaries/salary-adjustment-modal.tsx",
    "components/finance/salaries/salary-desktop-table.tsx",
    "components/finance/salaries/salary-detail-modal.tsx",
    "components/finance/salaries/salary-filters.tsx",
    "components/finance/salaries/salary-mobile-list.tsx",
    "components/finance/salaries/salary-mobile-swipe-card.tsx",
    "components/finance/salaries/salary-row-actions.tsx",
    "components/finance/salaries/salary-stats-bar.tsx",
    "components/finance/salaries/vendor-cost-desktop-table.tsx",
    "components/finance/salaries/vendor-cost-mobile-list.tsx",
    "components/finance/vendor-debts/vendor-costs-stats-bar.tsx",
    "components/finance/vendor-debts/vendor-debts-client.tsx",
    "components/finance/vendor-debts/vendor-debts-desktop-table.tsx",
    "components/finance/vendor-debts/vendor-debts-mobile-list.tsx",
    "components/finance/vendor-debts/vendor-debts-stats-bar.tsx",
    "components/finance/vendor-debts/vendor-payment-modal.tsx",
    "components/gallery/download-manager.tsx",
    "components/gallery/gallery-page-client.tsx",
    "components/gallery/gallery-virtual-grid.tsx",
    "components/gallery/image-viewer.tsx",
    "components/gallery/password-gate.tsx",
    "components/gallery/public-gallery-client.tsx",
    "components/gallery/selection-summary.tsx",
]


def analyze_component(file_path: Path) -> Dict[str, Any]:
    """Phân tích một component file chi tiết"""
    try:
        content = file_path.read_text(encoding='utf-8')
        lines = content.split('\n')

        # Basic info
        result = {
            'file': str(file_path.relative_to(ROOT)),
            'lines': len(lines),
            'size_kb': round(len(content) / 1024, 2),
            'type': 'typescript' if file_path.suffix == '.ts' else 'react-component',
        }

        # Extract imports
        imports = {
            'react_hooks': [],
            'custom_hooks': [],
            'supabase': [],
            'react_query': [],
            'ui_libs': [],
            'utilities': [],
            'components': []
        }

        # Patterns
        import_pattern = re.compile(r'import\s+(?:{([^}]+)}|\*\s+as\s+(\w+)|(\w+))\s+from\s+[\'"]([^\'"]+)[\'"]')

        for line in lines[:100]:  # Check first 100 lines for imports
            match = import_pattern.search(line)
            if match:
                named, namespace, default, source = match.groups()
                items = []
                if named:
                    items = [x.strip() for x in named.split(',')]
                elif namespace:
                    items = [namespace]
                elif default:
                    items = [default]

                # Categorize
                if source == 'react':
                    imports['react_hooks'].extend([x for x in items if x.startswith('use')])
                elif source.startswith('@tanstack/react-query'):
                    imports['react_query'].extend(items)
                elif source.startswith('@supabase') or 'supabase' in source:
                    imports['supabase'].extend(items)
                elif source.startswith('@/hooks') or source.startswith('./use-') or source.startswith('../use-'):
                    imports['custom_hooks'].extend(items)
                elif source.startswith('@/components/ui') or source.startswith('./ui/'):
                    imports['ui_libs'].extend(items)
                elif source.startswith('@/lib'):
                    imports['utilities'].extend(items)
                elif source.startswith('@/components') or source.startswith('./') or source.startswith('../'):
                    imports['components'].extend(items)

        # Clean up empty lists
        imports = {k: v for k, v in imports.items() if v}
        result['imports'] = imports

        # Detect hooks usage
        hooks_usage = []
        hook_pattern = re.compile(r'(use\w+)\s*\(')
        for line in content.split('\n'):
            for match in hook_pattern.finditer(line):
                hook_name = match.group(1)
                if hook_name not in hooks_usage:
                    hooks_usage.append(hook_name)

        result['hooks_used'] = hooks_usage[:20]  # Limit to 20

        # Detect component exports
        export_pattern = re.compile(r'export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)')
        exports = []
        for line in lines:
            match = export_pattern.search(line)
            if match:
                exports.append(match.group(1))

        result['exports'] = exports[:5]  # Top 5 exports

        # Detect Supabase queries
        supabase_queries = []
        if 'supabase' in content.lower():
            query_patterns = [
                r'\.from\([\'"](\w+)[\'"]\)',
                r'\.select\(',
                r'\.insert\(',
                r'\.update\(',
                r'\.delete\(',
                r'\.rpc\([\'"](\w+)[\'"]\)',
            ]
            for pattern in query_patterns:
                matches = re.findall(pattern, content)
                supabase_queries.extend(matches)

        if supabase_queries:
            result['supabase_tables'] = list(set([x for x in supabase_queries if x]))[:10]

        # Detect React Query usage
        react_query_usage = []
        if 'useQuery' in content or 'useMutation' in content:
            query_key_pattern = re.compile(r'queryKey:\s*\[([^\]]+)\]')
            matches = query_key_pattern.findall(content)
            react_query_usage.extend(matches[:5])

        if react_query_usage:
            result['query_keys'] = react_query_usage

        # Detect component type
        component_types = []
        if 'Modal' in file_path.name or 'modal' in content.lower():
            component_types.append('modal')
        if 'Drawer' in file_path.name or 'drawer' in content.lower():
            component_types.append('drawer')
        if 'Form' in file_path.name or 'form' in content.lower():
            component_types.append('form')
        if 'Table' in file_path.name or 'DataTable' in content:
            component_types.append('table')
        if 'Chart' in file_path.name or 'Chart' in content:
            component_types.append('chart')
        if 'List' in file_path.name:
            component_types.append('list')
        if 'Card' in file_path.name:
            component_types.append('card')
        if 'Grid' in file_path.name:
            component_types.append('grid')
        if 'Client' in file_path.name:
            component_types.append('client-page')
        if 'Stats' in file_path.name or 'Stat' in file_path.name:
            component_types.append('stats')
        if 'Filter' in file_path.name:
            component_types.append('filter')

        if component_types:
            result['component_types'] = component_types

        # Vietnamese summary
        category = file_path.parts[-3] if len(file_path.parts) > 3 else file_path.parts[-2]

        summary_parts = []
        if 'finance' in str(file_path):
            summary_parts.append('Component tài chính')
        elif 'crm' in str(file_path):
            summary_parts.append('Component CRM')
        elif 'dashboard' in str(file_path):
            summary_parts.append('Component dashboard')
        elif 'employee' in str(file_path):
            summary_parts.append('Component nhân viên')
        elif 'gallery' in str(file_path):
            summary_parts.append('Component thư viện ảnh')

        if component_types:
            type_vn = {
                'modal': 'dạng modal',
                'drawer': 'dạng drawer',
                'form': 'form nhập liệu',
                'table': 'bảng dữ liệu',
                'chart': 'biểu đồ',
                'list': 'danh sách',
                'card': 'card hiển thị',
                'grid': 'lưới layout',
                'client-page': 'trang client',
                'stats': 'thống kê',
                'filter': 'bộ lọc'
            }
            summary_parts.append(type_vn.get(component_types[0], component_types[0]))

        if hooks_usage:
            hook_count = len(hooks_usage)
            summary_parts.append(f'sử dụng {hook_count} hooks')

        if 'supabase_tables' in result:
            summary_parts.append(f'truy vấn {len(result["supabase_tables"])} bảng DB')

        if 'query_keys' in result:
            summary_parts.append('tích hợp React Query')

        result['summary_vi'] = ', '.join(summary_parts) if summary_parts else 'Component React'

        return result

    except Exception as e:
        return {
            'file': str(file_path.relative_to(ROOT)),
            'error': str(e),
            'summary_vi': 'Lỗi phân tích file'
        }


def create_batch(batch_num: int, files: List[str]) -> Dict[str, Any]:
    """Tạo một batch analysis"""
    batch_data = {
        'batch_number': batch_num,
        'created_at': datetime.now().isoformat(),
        'file_count': len(files),
        'files': []
    }

    print(f"\n=== BATCH {batch_num} ===")
    print(f"Analyzing {len(files)} files...")

    for rel_path in files:
        file_path = ROOT / rel_path
        if file_path.exists():
            print(f"  Analyzing: {rel_path}")
            analysis = analyze_component(file_path)
            batch_data['files'].append(analysis)
        else:
            print(f"  SKIP (not found): {rel_path}")
            batch_data['files'].append({
                'file': rel_path,
                'error': 'File not found',
                'summary_vi': 'File không tồn tại'
            })

    # Batch summary
    total_lines = sum(f.get('lines', 0) for f in batch_data['files'])
    total_size = sum(f.get('size_kb', 0) for f in batch_data['files'])

    all_hooks = set()
    all_tables = set()
    component_type_counts = {}

    for f in batch_data['files']:
        if 'hooks_used' in f:
            all_hooks.update(f['hooks_used'])
        if 'supabase_tables' in f:
            all_tables.update(f['supabase_tables'])
        if 'component_types' in f:
            for ct in f['component_types']:
                component_type_counts[ct] = component_type_counts.get(ct, 0) + 1

    batch_data['summary'] = {
        'total_lines': total_lines,
        'total_size_kb': round(total_size, 2),
        'unique_hooks': sorted(list(all_hooks))[:30],
        'supabase_tables': sorted(list(all_tables)),
        'component_types': component_type_counts
    }

    return batch_data


def main():
    """Main execution"""
    output_dir = ROOT / '.understand-anything' / 'intermediate'
    output_dir.mkdir(parents=True, exist_ok=True)

    # Split into 5 batches
    batch_size = 39  # 195 / 5 = 39

    for batch_num in range(26, 31):
        start_idx = (batch_num - 26) * batch_size
        end_idx = start_idx + batch_size
        batch_files = ALL_FILES[start_idx:end_idx]

        batch_data = create_batch(batch_num, batch_files)

        # Save
        output_file = output_dir / f'batch-{batch_num}.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(batch_data, f, indent=2, ensure_ascii=False)

        print(f"\n✓ Saved: {output_file}")
        print(f"  Files: {batch_data['file_count']}")
        print(f"  Lines: {batch_data['summary']['total_lines']:,}")
        print(f"  Size: {batch_data['summary']['total_size_kb']:.2f} KB")
        print(f"  Hooks: {len(batch_data['summary']['unique_hooks'])}")
        print(f"  Tables: {len(batch_data['summary']['supabase_tables'])}")

    print("\n" + "="*60)
    print("✓ ALL BATCHES 26-30 COMPLETED!")
    print("="*60)


if __name__ == '__main__':
    main()
