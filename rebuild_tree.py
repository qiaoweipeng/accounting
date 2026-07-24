import json
import csv

# 读取原有树形JSON，建立 code -> {scope, description} 映射
with open('会计科目_树形.json', 'r', encoding='utf-8') as f:
    old_data = json.load(f)

old_map = {}
def collect_old(items):
    for item in items:
        old_map[item['code']] = {
            'scope': item.get('scope', '所有企业'),
            'description': item.get('description', '')
        }
        if item.get('children'):
            collect_old(item['children'])
collect_old(old_data)

# 读取 Export.csv
rows = []
with open('Export.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    for row in reader:
        if not row or not row[0].strip():
            continue
        code = row[0].strip()
        name = row[1].strip()
        category = row[2].strip()
        balanceDirection = row[3].strip()
        rows.append({
            'code': code,
            'name': name,
            'category': category,
            'balanceDirection': balanceDirection,
        })

# 构建树形结构
# 4位=父级, 7位=子级(前4位父级), 9位=孙级(前7位父级)
nodes_by_code = {}
root_items = []

for row in rows:
    code = row['code']
    item = {
        'code': code,
        'name': row['name'],
        'category': row['category'],
        'balanceDirection': row['balanceDirection'],
        'scope': old_map.get(code, {}).get('scope', '所有企业'),
        'description': old_map.get(code, {}).get('description', ''),
    }
    nodes_by_code[code] = item

for row in rows:
    code = row['code']
    item = nodes_by_code[code]
    if len(code) == 4:
        item['children'] = []
        root_items.append(item)
    elif len(code) == 7:
        parent_code = code[:4]
        if parent_code in nodes_by_code:
            parent = nodes_by_code[parent_code]
            if 'children' not in parent:
                parent['children'] = []
            item['children'] = []
            parent['children'].append(item)
    elif len(code) == 9:
        parent_code = code[:7]
        if parent_code in nodes_by_code:
            parent = nodes_by_code[parent_code]
            if 'children' not in parent:
                parent['children'] = []
            parent['children'].append(item)

# 删除空的 children 字段
def clean_empty_children(items):
    for item in items:
        if 'children' in item:
            if item['children']:
                clean_empty_children(item['children'])
            else:
                del item['children']
clean_empty_children(root_items)

with open('会计科目_树形.json', 'w', encoding='utf-8') as f:
    json.dump(root_items, f, ensure_ascii=False, indent=2)

# 统计
def count_all(items):
    total = 0
    for item in items:
        total += 1
        if item.get('children'):
            total += count_all(item['children'])
    return total

total = count_all(root_items)
parents_with_children = sum(1 for item in root_items if item.get('children'))
print(f"转换完成，共 {len(root_items)} 个父级科目，总计 {total} 条记录")
print(f"有子科目的父级: {parents_with_children}")
for item in root_items:
    if item.get('children'):
        child_count = count_all(item['children'])
        print(f"  {item['code']} {item['name']}: {len(item['children'])} 个直接子科目（含孙级共 {child_count} 条）")