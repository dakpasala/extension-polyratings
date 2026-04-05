import json
import csv
import re
import sys

def clean_summary_text(raw_text):
    # 1. Remove the URL from the text (we extract it separately)
    text = re.sub(r'https?://[^\s]+', '', raw_text).strip()
    
    # 2. Remove common AI conversational prefixes (case insensitive)
    prefix_patterns = [
        r'^Based on (the )?(evaluations|data|feedback|provided data), here\'s a summary of Professor [\w\s.\-]+:?',
        r'^Here\'s a summary of Professor [\w\s.\-]+\'s performance.*:?',
        r'^Professor [\w\s.\-]+ can be found on PolyRatings here:?',
        r'^Based on the evaluations, I can summarize Professor [\w\s.\-]+\'s teaching style as follows:?'
    ]
    for pattern in prefix_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE).strip()
    
    # 3. Remove conversational outros like "Find Professor X on PolyRatings here:"
    outro_patterns = [
        r'(If you\'re interested in seeing more|Find Professor|You can visit|Professor [\w\s.\-]+ can be found).*?PolyRatings.*$',
    ]
    for pattern in outro_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.DOTALL).strip()
    
    # 4. Final cleaning: replace any newlines/tabs/extra spaces with a single space
    # This makes the CSV "flat" and easy to import into tools like Supabase.
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

input_file = sys.argv[1] if len(sys.argv) > 1 else 'ai_summaries.json'
output_file = sys.argv[2] if len(sys.argv) > 2 else 'ai_summaries.csv'

with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Loaded {len(data)} professor summaries")

fixed_rows = []
for name, raw_text in data.items():
    # Extract the link
    link_match = re.search(r'(https://polyratings\.dev/professor/[^\s]+)', raw_text)
    link = link_match.group(1) if link_match else ''
    
    # Clean the summary text
    summary = clean_summary_text(raw_text)
    
    fixed_rows.append([name, summary, link])

# Write to CSV
with open(output_file, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['professor_name', 'summary', 'polyratings_link'])
    writer.writerows(fixed_rows)

print(f"Successfully written {len(fixed_rows)} rows to {output_file}")