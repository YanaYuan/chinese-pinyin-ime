import json

data = json.load(open('Pinyin/dict.json', 'r', encoding='utf-8'))

print("=== Single Characters ===")
for item in data:
    if item['Chinese'] in ['西', '下', '想', '小', '希', '吸', '喜', '席']:
        print(f"{item['Chinese']}: '{item['Pinyin']}'")

print("\n=== Two Character Words ===")
for item in data:
    if item['Chinese'] in ['现在', '西安', '希望', '下面']:
        print(f"{item['Chinese']}: '{item['Pinyin']}'")
