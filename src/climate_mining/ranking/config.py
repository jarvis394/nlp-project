from climate_mining.paths import DATA

ANALYSIS = DATA / "analysis"
STEP = 10  # subset / bucket size, as in steps 3-4
N_TOPICS = 5
SEED = 42

# Domain to source type
SOURCE_RULES = [
    ("video", r"youtube\.com|vimeo\.com|tiktok\.com"),
    ("encyclopedia", r"wikipedia\.org|britannica\.com"),
    ("agency / UN", r"\.gov(\.\w+)?$|\.int$|(^|\.)un\.org$|unep\.org|ipcc\.ch|"
                    r"unfccc\.int|europa\.eu|worldbank\.org|metoffice|theccc\.org\.uk"),
    ("science / academia", r"\.edu$|\.ac\.\w+$|nature\.com|science\.org|"
                           r"royalsociety\.org|sciencenews\.org|niussp\.org"),
    ("news / media", r"news|bbc\.|reuters|apnews|wired\.com|dw\.com|yahoo\.com|"
                     r"nationalgeographic|theconversation|space\.com|ecowatch|"
                     r"earth\.org|greenmatters|newsroom|matters\.org"),
    ("NGO / advocacy", r"\.org(\.\w+)?$"),
]  # fmt: skip
SOURCE_ORDER = [name for name, _ in SOURCE_RULES] + ["commercial / other"]

# What `takeaway` from LLM talks about
THEMES = {
    "causes": r"fossil|emission|greenhouse|human activit|burning|carbon dioxide|CO2|deforest",
    "impacts": r"extreme|flood|drought|heat|sea.level|wildfire|storm|threat|risk|health|"
               r"ecosystem|species|food",
    "solutions": r"renewable|reduc|cut|adapt|solution|transition|net.zero|mitigat|"
                 r"clean energy|innovat|protect",
    "policy": r"polic|agreement|government|negotiat|COP|law|financ|fund|nations",
    "evidence": r"data|observ|satellite|research|scientist|evidence|record|stud|model",
}  # fmt: skip

# Column to plot label
METRICS = {
    "stance": "LLM stance (-1 negative .. +1 positive)",
    "vader_takeaway": "VADER of takeaway (-1 .. +1)",
    "vader_snippet": "VADER of snippet (-1 .. +1)",
    "awareness": "awareness (0-5)",
    "reference_quality": "reference quality (1-5)",
    "n_actions": "actions asked of the reader",
    "drift": "message drift from top 10 (0-1)",
    "novelty": "novelty vs higher-ranked (0-1)",
    "solutions": "takeaway mentions solutions (0/1)",
}
