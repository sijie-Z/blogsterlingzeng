import json, sys, urllib.request, urllib.parse

def search(query, sort="stars", per_page=20):
    q = urllib.parse.quote(query)
    url = f"https://api.github.com/search/repositories?q={q}&sort={sort}&order=desc&per_page={per_page}"
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "research-script"})
    with urllib.request.urlopen(req) as r:
        d = json.load(r)
    print(f"=== query: {query} | total={d.get('total_count')} ===")
    for i in d.get("items", []):
        print(f"{i['stargazers_count']:>6}* {i['full_name']:<55} {str(i['language']):<12} {i.get('description') or ''}")
    print()

if __name__ == "__main__":
    for q in sys.argv[1:]:
        try:
            search(q)
        except Exception as e:
            print(f"ERROR for {q}: {e}", file=sys.stderr)
