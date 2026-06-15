from pathlib import Path
import re
text=Path('types/database.types.ts').read_text(encoding='utf-8')
tables='contracts contract_items contract_events contract_checklists contract_notes work_tasks payments payment_plans payment_plan_allocations services service_categories service_bundles service_relations price_rules dress_reservations printing_orders gallery_share_links gallery_selection_batches gallery_selection_batch_items gallery_filter_jobs google_sync_queue'.split()
for t in tables:
    i=text.find(f'      {t}: {{')
    if i<0:
        print(f'## {t}: NOT FOUND'); continue
    r=text.find('        Row: {', i); e=text.find('        Insert:', r); row=text[r:e]
    cols=[]
    for line in row.splitlines():
        s=line.strip()
        if s and ':' in s and not s.startswith('Row') and not s.startswith('}'):
            cols.append(s.split(':')[0])
    rel_start=text.find('        Relationships:', i, text.find('      }', e)+1)
    next_table=text.find('\n      }', rel_start)+8
    rel_block=text[rel_start:next_table]
    rels=[]
    for m in re.finditer(r"foreignKeyName: '([^']+)'.*?columns: \[(.*?)\].*?referencedRelation: '([^']+)'.*?referencedColumns: \[(.*?)\]", rel_block, re.S):
        cols2=m.group(2).replace("'",'').replace(' ','').replace('\n','')
        refcols=m.group(4).replace("'",'').replace(' ','').replace('\n','')
        rels.append(f"{cols2}->{m.group(3)}({refcols}) [{m.group(1)}]")
    print(f'## {t}')
    print('columns: '+', '.join(cols))
    print('relations: '+('; '.join(rels) if rels else '[]'))

print('## FUNCTIONS')
fi=text.find('    Functions: {', text.find('  public: {'))
ei=text.find('    Enums: {', fi)
block=text[fi:ei]
funcs=re.findall(r'^      ([A-Za-z0-9_]+): \{', block, re.M)
for f in funcs:
    if any(k in f for k in ['contract','payment','service','calendar','gallery','work_task','printing','dress','vendor','inventory']):
        print(f)
