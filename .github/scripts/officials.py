#!/usr/bin/env python3
"""Builds data/officials/v1.json: the people and facts behind the civics questions whose answers change.

The US Citizenship Test apps (English and Spanish, iOS and Android) read this file to answer the questions
about the President, Vice President, Speaker of the House, Chief Justice, the number of Supreme Court
justices, the President's party, and each state's senators, representatives, governor and capital.

Nothing is published on the word of a single source. Every fact is read from two independent sources
(three for the House) and is taken only when they agree:

  fact                     first source                          second source
  -----------------------  ------------------------------------  ----------------------------------------
  President, Vice Pres.    congress-legislators executive.json   whitehouse.gov/administration
  Speaker of the House     speaker.gov                           Wikidata (position held, no end date)
  Chief Justice, justices  supremecourt.gov biographies          Wikidata (position held, no end date)
  U.S. senators            congress-legislators                  Congress.gov API (Library of Congress);
                                                                 Wikidata when the API can't be reached
  U.S. representatives     Clerk of the House MemberData.xml     congress-legislators or Congress.gov API
  Governors                Open States (openstates/people)       USA.gov state pages
  Capitals                 fixed table below (they don't change) checked against the previous file

When the sources disagree, or one can't be reached, the previous value of that fact is kept, the run
is reported as failed (exit code 1) and GitHub emails the repository owner. A file is never written
when a check of the whole file fails (wrong number of states, seats, senators...): exit code 2.

Usage:
  python3 officials.py --out data/officials/v1.json [--previous data/officials/v1.json]

Environment:
  CONGRESS_API_KEY   api.data.gov key for the Congress.gov API (free). DEMO_KEY is used without it.

Python 3.9+, standard library only.
"""

import argparse
import datetime as dt
import html
import io
import json
import os
import re
import sys
import tarfile
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

SCHEMA_VERSION = 1
USER_AGENT = "civics-officials-check/1.0 (+https://github.com/unitedstates/congress-legislators)"
BROWSER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.0 Safari/605.1.15"
)

URLS = {
    "legislators": "https://unitedstates.github.io/congress-legislators/legislators-current.json",
    "executive": "https://unitedstates.github.io/congress-legislators/executive.json",
    "clerk": "https://clerk.house.gov/xml/lists/MemberData.xml",
    "congress": "https://api.congress.gov/v3/member",
    "whitehouse": "https://www.whitehouse.gov/administration/",
    "speaker": "https://www.speaker.gov/",
    "scotus": "https://www.supremecourt.gov/about/biographies.aspx",
    "wikidata": "https://query.wikidata.org/sparql",
    "openstates": "https://codeload.github.com/openstates/people/tar.gz/refs/heads/main",
    "usagov": "https://www.usa.gov/states/{slug}",
}

# Shown in the apps next to each fact. Only sources a run actually read are listed with a fact.
SOURCES = {
    "whitehouse": {"name": "The White House", "url": "https://www.whitehouse.gov/administration/"},
    "speaker": {"name": "Office of the Speaker", "url": "https://www.speaker.gov/"},
    "scotus": {"name": "Supreme Court of the United States",
               "url": "https://www.supremecourt.gov/about/biographies.aspx"},
    "clerk": {"name": "Clerk of the U.S. House", "url": "https://clerk.house.gov/Members"},
    "congressgov": {"name": "Congress.gov", "url": "https://www.congress.gov/members"},
    "usagov": {"name": "USA.gov", "url": "https://www.usa.gov/state-governor"},
    "legislators": {"name": "congress-legislators", "url": "https://github.com/unitedstates/congress-legislators"},
    "openstates": {"name": "Open States", "url": "https://github.com/openstates/people"},
    "wikidata": {"name": "Wikidata", "url": "https://www.wikidata.org"},
}

# The 50 states and D.C., the places the apps let users pick.
STATES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "DC": "District of Columbia",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana",
    "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri",
    "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey",
    "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
    "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}

CAPITALS = {
    "AL": "Montgomery", "AK": "Juneau", "AZ": "Phoenix", "AR": "Little Rock", "CA": "Sacramento",
    "CO": "Denver", "CT": "Hartford", "DE": "Dover", "FL": "Tallahassee", "GA": "Atlanta",
    "HI": "Honolulu", "ID": "Boise", "IL": "Springfield", "IN": "Indianapolis", "IA": "Des Moines",
    "KS": "Topeka", "KY": "Frankfort", "LA": "Baton Rouge", "ME": "Augusta", "MD": "Annapolis",
    "MA": "Boston", "MI": "Lansing", "MN": "Saint Paul", "MS": "Jackson", "MO": "Jefferson City",
    "MT": "Helena", "NE": "Lincoln", "NV": "Carson City", "NH": "Concord", "NJ": "Trenton",
    "NM": "Santa Fe", "NY": "Albany", "NC": "Raleigh", "ND": "Bismarck", "OH": "Columbus",
    "OK": "Oklahoma City", "OR": "Salem", "PA": "Harrisburg", "RI": "Providence", "SC": "Columbia",
    "SD": "Pierre", "TN": "Nashville", "TX": "Austin", "UT": "Salt Lake City", "VT": "Montpelier",
    "VA": "Richmond", "WA": "Olympia", "WV": "Charleston", "WI": "Madison", "WY": "Cheyenne",
}

# House seats per state after the 2020 census (118th Congress on). 435 in all; 1 = one at-large district.
SEATS = {
    "AL": 7, "AK": 1, "AZ": 9, "AR": 4, "CA": 52, "CO": 8, "CT": 5, "DE": 1, "FL": 28, "GA": 14,
    "HI": 2, "ID": 2, "IL": 17, "IN": 9, "IA": 4, "KS": 4, "KY": 6, "LA": 6, "ME": 2, "MD": 8,
    "MA": 9, "MI": 13, "MN": 8, "MS": 4, "MO": 8, "MT": 2, "NE": 3, "NV": 4, "NH": 2, "NJ": 12,
    "NM": 3, "NY": 26, "NC": 14, "ND": 1, "OH": 15, "OK": 5, "OR": 6, "PA": 17, "RI": 2, "SC": 7,
    "SD": 1, "TN": 9, "TX": 38, "UT": 4, "VT": 1, "VA": 11, "WA": 10, "WV": 2, "WI": 8, "WY": 1,
}

SUPREME_COURT_SEATS = 9  # Set by law (28 U.S.C. § 1); a vacancy doesn't change it.

WIKIDATA_OFFICES = {
    "president": "Q11696",
    "vicePresident": "Q11699",
    "speaker": "Q912994",
    "chiefJustice": "Q11147",
    "associateJustice": "Q11144",
}

# Third sources: a missing one doesn't fail the run while the other two agree.
OPTIONAL_THIRD_SOURCES = {"Congress.gov API", "Wikidata associateJustice", "Wikidata president", "Wikidata vicePresident"}

NAME_SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}


class SourceError(Exception):
    pass


# MARK: - Fetching


def fetch(url, *, browser=False, accept=None, attempts=3, timeout=45):
    headers = {"User-Agent": BROWSER_AGENT if browser else USER_AGENT}
    if accept:
        headers["Accept"] = accept
    last_error = None
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return response.read()
        except (urllib.error.URLError, OSError) as error:  # HTTPError is a URLError
            last_error = error
            if isinstance(error, urllib.error.HTTPError) and error.code in (400, 401, 403, 404):
                break
            time.sleep(2 * (attempt + 1))
    raise SourceError("%s: %s" % (url.split("?")[0], last_error))


def fetch_json(url, **kwargs):
    return json.loads(fetch(url, accept="application/json", **kwargs).decode("utf-8"))


def page_lines(raw):
    text = raw.decode("utf-8", errors="replace")
    text = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", text)
    text = re.sub(r"<[^>]+>", "\n", text)
    text = html.unescape(text).replace(" ", " ")
    return [re.sub(r"\s+", " ", line).strip() for line in text.split("\n") if line.strip()]


def page_title(raw):
    match = re.search(r"(?is)<title[^>]*>(.*?)</title>", raw.decode("utf-8", errors="replace"))
    return re.sub(r"\s+", " ", html.unescape(match.group(1))).strip() if match else ""


def wikidata_holders(office_id):
    """Living people holding the office: a start date and no end date, instances of human."""
    query = (
        "SELECT ?person ?personLabel ?start WHERE { ?person wdt:P31 wd:Q5; p:P39 ?st. "
        "?st ps:P39 wd:%s; pq:P580 ?start. FILTER NOT EXISTS { ?st pq:P582 ?end } "
        "FILTER NOT EXISTS { ?person wdt:P570 ?died } "
        'SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }' % office_id
    )
    url = URLS["wikidata"] + "?" + urllib.parse.urlencode({"query": query, "format": "json"})
    data = fetch_json(url)
    return [
        {"name": row["personLabel"]["value"], "start": row["start"]["value"][:10]}
        for row in data["results"]["bindings"]
    ]


def wikidata_senators():
    """Bioguide ids of sitting U.S. senators on Wikidata (position held: United States senator, no end date)."""
    query = (
        "SELECT ?bio WHERE { ?person wdt:P31 wd:Q5; wdt:P1157 ?bio; p:P39 ?st. "
        "?st ps:P39 wd:Q4416090; pq:P580 ?start. FILTER NOT EXISTS { ?st pq:P582 ?end } }"
    )
    url = URLS["wikidata"] + "?" + urllib.parse.urlencode({"query": query, "format": "json"})
    rows = fetch_json(url)["results"]["bindings"]
    return {row["bio"]["value"] for row in rows}


# MARK: - Names


def fold(text):
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9 ]+", " ", text.lower().replace("-", " ")).split()


def family_name(name):
    tokens = [t for t in fold(name) if t not in NAME_SUFFIXES]
    return tokens[-1] if tokens else ""


def same_person(a, b):
    """Two spellings of one name: same family name, and the same first name or first initial."""
    ta = [t for t in fold(a) if t not in NAME_SUFFIXES]
    tb = [t for t in fold(b) if t not in NAME_SUFFIXES]
    if not ta or not tb or ta[-1] != tb[-1]:
        return False
    given_a, given_b = ta[:-1], tb[:-1]
    if not given_a or not given_b:
        return True
    # "J. Kevin Stitt" and "Kevin Stitt"; "JB Pritzker" and "J.B. Pritzker" ("j b"); "Joe" and "Joseph".
    if set(given_a) & set(given_b) or "".join(given_a) == "".join(given_b):
        return True
    return given_a[0][0] == given_b[0][0]


def answer_variants(full_name):
    """The forms USCIS accepts: the full name, first and last name, last name."""
    words = full_name.replace(",", " ").split()
    words = [w for w in words if w.strip(".").lower() not in NAME_SUFFIXES]
    core = [w for w in words if not re.fullmatch(r"[A-Z]\.", w)]  # drop middle initials
    variants = [full_name]
    if len(core) >= 2:
        first_last = "%s %s" % (core[0], core[-1])
        if first_last not in variants:
            variants.append(first_last)
    if core and core[-1] not in variants:
        variants.append(core[-1])
    return variants


def valid_name(name):
    # Letters (accents too), spaces and . , ' - and the quotes around a nickname: Robert C. "Bobby" Scott.
    return bool(name) and 3 <= len(name) <= 60 and re.fullmatch(r"[A-Za-zÀ-ÖØ-öø-ÿ.,'’\-\" ]+", name) is not None


def party_name(raw):
    value = (raw or "").strip().lower()
    if value in ("d", "democrat", "democratic", "democratic party"):
        return "Democratic"
    if value in ("r", "republican", "republican party"):
        return "Republican"
    if value in ("i", "id", "independent", "independent party"):
        return "Independent"
    return (raw or "").strip() or None


def legislator_name(person):
    name = person["name"]
    if name.get("official_full"):
        return name["official_full"]
    parts = [name.get("first"), name.get("middle"), name.get("last")]
    full = " ".join(p for p in parts if p)
    return full + (", " + name["suffix"] if name.get("suffix") else "")


# MARK: - Facts


class Run:
    def __init__(self, previous):
        self.previous = previous or {}
        self.issues = []
        self.notes = []
        self.today = dt.date.today().isoformat()

    def issue(self, message):
        """A fact that couldn't be confirmed: the previous value is kept and the run fails."""
        self.issues.append(message)
        print("ISSUE: " + message, file=sys.stderr)

    def note(self, message):
        """A third source that disagrees with two that agree: logged, doesn't fail the run."""
        self.notes.append(message)
        print("NOTE: " + message, file=sys.stderr)

    def previous_national(self, key):
        return (self.previous.get("national") or {}).get(key)

    def previous_state(self, code):
        return (self.previous.get("states") or {}).get(code) or {}


def current_term(person, kind, today):
    for term in person.get("terms", []):
        if term.get("type") == kind and term["start"] <= today < term.get("end", "9999-12-31"):
            return term
    return None


def executive_fact(run, executive, whitehouse_lines, kind, title):
    """President or Vice President: the current term in executive.json, confirmed by the White House."""
    holders = [(p, current_term(p, kind, run.today)) for p in executive]
    holders = [(p, t) for p, t in holders if t]
    if len(holders) != 1:
        raise SourceError("executive.json has %d current %s terms" % (len(holders), kind))
    person, term = holders[0]
    family = person["name"]["last"]
    # "President Donald J. Trump" / "Vice President JD Vance" on the White House page: also the display name.
    pattern = re.compile(
        r"(?<![A-Za-z])%s ((?:[A-Z][A-Za-z.'’\-]*\s){0,3}%s(?:,? Jr\.)?)\b" % (re.escape(title), re.escape(family))
    )
    shown = None
    for line in whitehouse_lines:
        if kind == "prez" and "Vice President" in line:
            line = line.replace("Vice President", "")
        match = pattern.search(line)
        if match:
            shown = match.group(1).strip()
            break
    if not shown:
        raise SourceError("whitehouse.gov doesn't name %s %s" % (title, family))
    if not same_person(shown, legislator_name(person)) and family_name(shown) != fold(family)[-1]:
        raise SourceError("whitehouse.gov (%s) and executive.json (%s) disagree" % (shown, family))
    return {
        "name": shown,
        "answers": answer_variants(shown),
        "party": party_name(term.get("party")),
        "since": term["start"],
    }


def speaker_fact(run, speaker_raw, wikidata, legislators):
    title = page_title(speaker_raw)
    match = re.search(r"Speaker(?: of the House)?\s+((?:[A-Z][A-Za-z.'’\-]*\s?){1,4})", title)
    if not match:
        raise SourceError("speaker.gov title doesn't name the Speaker: %r" % title)
    from_page = match.group(1).strip()
    holders = [h for h in wikidata if same_person(h["name"], from_page)]
    if len(wikidata) != 1 or not holders:
        raise SourceError("speaker.gov (%s) and Wikidata (%s) disagree" % (from_page, [h["name"] for h in wikidata]))
    members = [
        p for p in legislators
        if p["terms"][-1]["type"] == "rep" and same_person(legislator_name(p), from_page)
    ]
    if len(members) != 1:
        raise SourceError("the Speaker (%s) isn't one current House member" % from_page)
    name = legislator_name(members[0])
    return {
        "name": name,
        "answers": answer_variants(name),
        "party": party_name(members[0]["terms"][-1].get("party")),
        "since": holders[0]["start"],
    }


def court_facts(run, scotus_raw, chief_wikidata, associate_wikidata):
    lines = page_lines(scotus_raw)
    chiefs, associates = [], []
    for line in lines:
        match = re.match(r"^(.+?), (Chief Justice of the United States|Associate Justice),?$", line)
        if not match or "(Retired)" in match.group(1):
            continue
        (chiefs if match.group(2).startswith("Chief") else associates).append(match.group(1).strip())
    if len(chiefs) != 1:
        raise SourceError("supremecourt.gov lists %d sitting Chief Justices" % len(chiefs))
    chief = chiefs[0]
    if len(chief_wikidata) != 1 or not same_person(chief_wikidata[0]["name"], chief):
        raise SourceError("supremecourt.gov (%s) and Wikidata (%s) disagree on the Chief Justice"
                          % (chief, [h["name"] for h in chief_wikidata]))
    justices = 1 + len(associates)
    if not 7 <= justices <= SUPREME_COURT_SEATS:
        raise SourceError("supremecourt.gov lists %d sitting justices" % justices)
    if len(associate_wikidata) + 1 != justices:
        run.note("Wikidata counts %d associate justices, supremecourt.gov %d (kept supremecourt.gov)"
                  % (len(associate_wikidata), len(associates)))
    return (
        {"name": chief, "answers": answer_variants(chief), "since": chief_wikidata[0]["start"]},
        justices,
    )


def congress_members(api_key):
    """Current members from the Congress.gov API: bioguide id → (chamber, state code, district)."""
    codes = {name: code for code, name in STATES.items()}
    members, offset = {}, 0
    while True:
        query = urllib.parse.urlencode(
            {"currentMember": "true", "limit": 250, "offset": offset, "format": "json", "api_key": api_key})
        data = fetch_json(URLS["congress"] + "?" + query)
        for member in data.get("members", []):
            terms = (member.get("terms") or {}).get("item") or []
            if not terms:
                continue
            chamber = "sen" if terms[-1].get("chamber") == "Senate" else "rep"
            code = codes.get(member.get("state"))
            if code:
                members[member["bioguideId"]] = (chamber, code, member.get("district") or 0)
        offset += 250
        if offset >= (data.get("pagination") or {}).get("count", 0) or not data.get("members"):
            break
    if len(members) < 500:
        raise SourceError("Congress.gov API returned %d members" % len(members))
    return members


def clerk_house(clerk_raw):
    """Seats from the Clerk: (state, district) → member info or None when vacant; and the Congress number."""
    root = ET.fromstring(clerk_raw)
    congress = int(root.findtext("title-info/congress-num") or 0)
    seats = {}
    for member in root.iter("member"):
        seat = member.findtext("statedistrict") or ""
        code, district = seat[:2], int(seat[2:] or 0)
        info = member.find("member-info")
        name = (info.findtext("official-name") or "").strip() if info is not None else ""
        if not name:
            seats[(code, district)] = None
            continue
        seats[(code, district)] = {
            "bioguide": info.findtext("bioguideID"),
            "name": name,
            "party": party_name(info.findtext("party")),
        }
    if len(seats) < 435:
        raise SourceError("Clerk MemberData.xml lists %d seats" % len(seats))
    return congress, seats


def congress_facts(run, legislators, clerk_seats, congress_api, wikidata_sens):
    """Senators and representatives for every state; per-state fallback to the previous file."""
    by_state = {code: {"sen": [], "rep": {}} for code in STATES}
    for person in legislators:
        term = person["terms"][-1]
        code = term.get("state")
        if code not in by_state:
            continue
        entry = {
            "bioguide": person["id"]["bioguide"],
            "name": legislator_name(person),
            "party": party_name(term.get("party")),
            "rank": term.get("state_rank"),
        }
        if term["type"] == "sen":
            by_state[code]["sen"].append(entry)
        else:
            by_state[code]["rep"][int(term.get("district") or 0)] = entry

    api_senators = {}
    if congress_api is not None:
        for bioguide, (chamber, code, _) in congress_api.items():
            if chamber == "sen":
                api_senators.setdefault(code, set()).add(bioguide)

    result = {}
    for code in STATES:
        previous = run.previous_state(code)
        senators = sorted(by_state[code]["sen"], key=lambda s: (s["rank"] != "senior", s["name"]))
        sen_ok = True
        listed_ids = {s["bioguide"] for s in senators}
        if code == "DC":
            sen_ok = not senators
        elif len(senators) > 2 or not senators:
            run.issue("%s senators: congress-legislators lists %d" % (code, len(senators)))
            sen_ok = False
        elif congress_api is not None:
            # Congress.gov (Library of Congress) must list exactly the same senators.
            sen_ok = listed_ids == api_senators.get(code, set())
            if not sen_ok:
                run.issue("%s senators: congress-legislators %s ≠ Congress.gov %s"
                          % (code, sorted(s["name"] for s in senators), sorted(api_senators.get(code, set()))))
        elif wikidata_sens is not None:
            # Without Congress.gov: every senator must also be a sitting senator on Wikidata.
            sen_ok = listed_ids <= wikidata_sens
            if not sen_ok:
                run.issue("%s senators: %s not confirmed by Wikidata"
                          % (code, sorted(s["name"] for s in senators if s["bioguide"] not in wikidata_sens)))
        else:
            run.issue("%s senators: no second source reachable, kept the previous list" % code)
            sen_ok = False
        if sen_ok:
            senator_list = [{"name": s["name"], "party": s["party"]} for s in senators]
        elif "senators" in previous:
            senator_list = previous["senators"]
        else:
            raise SourceError("%s senators can't be confirmed and there is no previous list" % code)

        representatives, delegate = [], None
        if code == "DC":
            seat = clerk_seats.get(("DC", 0))
            listed = by_state["DC"]["rep"].get(0)
            if seat and listed and seat["bioguide"] == listed["bioguide"]:
                delegate = {"name": listed["name"], "party": listed["party"], "title": "Delegate"}
            elif seat is None and listed is None:
                delegate = None
            else:
                run.issue("DC delegate: Clerk %s ≠ congress-legislators %s"
                          % (seat and seat["name"], listed and listed["name"]))
                delegate = previous.get("delegate")
        else:
            count = SEATS[code]
            districts = [0] if count == 1 else list(range(1, count + 1))
            previous_reps = {r["district"]: r for r in previous.get("representatives", [])}
            for district in districts:
                seat = clerk_seats.get((code, district), "missing")
                listed = by_state[code]["rep"].get(district)
                api = None
                if congress_api is not None:
                    api = next((b for b, (c, s, d) in congress_api.items()
                                if c == "rep" and s == code and int(d or 0) == district), None)
                if seat == "missing":
                    run.issue("%s-%d: the Clerk doesn't list this seat" % (code, district))
                    agreed = "keep"
                elif seat is None:
                    # Vacant at the Clerk: the other sources must not list anyone either.
                    agreed = "vacant" if listed is None and api is None else "keep"
                    if agreed == "keep":
                        run.issue("%s-%d: vacant at the Clerk, but listed elsewhere (%s / %s)"
                                  % (code, district, listed and listed["name"], api))
                else:
                    votes = [listed and listed["bioguide"] == seat["bioguide"], api == seat["bioguide"]]
                    if congress_api is None:
                        agreed = "seat" if votes[0] else "keep"
                    else:
                        agreed = "seat" if any(votes) else "keep"
                    if agreed == "keep":
                        run.issue("%s-%d: Clerk %s isn't confirmed by congress-legislators or Congress.gov"
                                  % (code, district, seat["name"]))
                if agreed == "seat":
                    name = listed["name"] if listed and listed["bioguide"] == seat["bioguide"] else seat["name"]
                    representatives.append({"district": district, "name": name, "party": seat["party"]})
                elif agreed == "vacant":
                    representatives.append({"district": district, "vacant": True})
                elif district in previous_reps:
                    representatives.append(previous_reps[district])
                else:
                    raise SourceError("%s-%d can't be confirmed and there is no previous value" % (code, district))
        result[code] = {"senators": senator_list, "representatives": representatives, "delegate": delegate}
    return result


def openstates_governors(run, tar_raw):
    """Current governor per state from openstates/people: data/<state>/executive/*.yml."""
    governors = {}
    with tarfile.open(fileobj=io.BytesIO(tar_raw), mode="r:gz") as archive:
        for member in archive.getmembers():
            match = re.search(r"/data/([a-z]{2})/executive/[^/]+\.yml$", member.name)
            if not match or not member.isfile():
                continue
            code = match.group(1).upper()
            if code not in STATES:
                continue
            text = archive.extractfile(member).read().decode("utf-8")
            person = parse_openstates_person(text)
            for role in person["roles"]:
                if role.get("type") != "governor":
                    continue
                start, end = role.get("start_date", "0000"), role.get("end_date", "9999-12-31")
                if start <= run.today < end:
                    governors.setdefault(code, []).append(
                        {"name": person["name"], "party": party_name(person["party"]), "since": start})
    return governors


def parse_openstates_person(text):
    """The few fields needed from an Open States person file (simple, regular YAML)."""
    name = re.search(r"(?m)^name: (.+)$", text)
    party = re.search(r"(?m)^party:\n- name: (.+)$", text)
    roles = []
    block = re.search(r"(?ms)^roles:\n(.*?)(?=^[A-Za-z_])", text + "\nend:")
    if block:
        for chunk in re.split(r"(?m)^- ", block.group(1)):
            role = {}
            for key, value in re.findall(r"(?m)^\s*(\w+): '?([^'\n]*)'?$", chunk):
                role[key] = value.strip()
            if role:
                roles.append(role)
    return {
        "name": name.group(1).strip().strip("'\"") if name else "",
        "party": party.group(1).strip() if party else None,
        "roles": roles,
    }


def usagov_governor(code):
    slug = STATES[code].lower().replace(" ", "-")
    lines = page_lines(fetch(URLS["usagov"].format(slug=slug), browser=True))
    # "Governor Mike Dunleavy"; some pages only have "Contact Governor Dan McKee".
    for line in lines:
        match = re.match(r"^(?:Contact )?Governor ([A-Z][^:]+)$", line)
        if match and len(match.group(1).split()) >= 2:
            return match.group(1).strip()
    raise SourceError("usa.gov/%s doesn't name a governor" % slug)


def governor_facts(run, openstates):
    result = {}
    for code in STATES:
        if code == "DC":
            result[code] = None
            continue
        previous = run.previous_state(code).get("governor")
        candidates = (openstates or {}).get(code, [])
        try:
            official = usagov_governor(code)
        except SourceError as error:
            official = None
            run.issue("%s governor: %s" % (code, error))
        time.sleep(0.3)  # Polite to USA.gov.
        if len(candidates) == 1 and official and same_person(candidates[0]["name"], official):
            # The name as the government writes it (USA.gov), confirmed by Open States.
            result[code] = {"name": official if valid_name(official) else candidates[0]["name"],
                            "party": candidates[0]["party"]}
            continue
        if official:
            run.issue("%s governor: Open States %s ≠ USA.gov %s"
                      % (code, [c["name"] for c in candidates], official))
        if previous:
            result[code] = previous
        else:
            raise SourceError("%s governor can't be confirmed and there is no previous value" % code)
    return result


# MARK: - Whole file


def check_file(doc):
    """Structure of the whole file; any failure stops the run before anything is written."""
    problems = []
    national = doc["national"]
    for key in ("president", "vicePresident", "speaker", "chiefJustice"):
        person = national.get(key)
        if not person or not valid_name(person.get("name", "")) or not person.get("answers"):
            problems.append("national.%s is missing or malformed" % key)
    if national.get("presidentParty") not in ("Democratic", "Republican", "Independent"):
        problems.append("national.presidentParty is %r" % national.get("presidentParty"))
    if national.get("supremeCourtSeats") != SUPREME_COURT_SEATS:
        problems.append("supremeCourtSeats is %r" % national.get("supremeCourtSeats"))
    names = {national[k]["name"] for k in ("president", "vicePresident", "speaker", "chiefJustice")
             if national.get(k)}
    if len(names) != 4:
        problems.append("two national offices have the same holder")
    if set(doc["states"]) != set(STATES):
        problems.append("states: %s" % sorted(set(STATES) ^ set(doc["states"])))
    seats = 0
    for code, state in doc["states"].items():
        if code == "DC":
            if state["senators"] or state["representatives"] or state["governor"] or state["capital"]:
                problems.append("DC has state officials")
            continue
        if not 1 <= len(state["senators"]) <= 2:
            problems.append("%s has %d senators" % (code, len(state["senators"])))
        for person in state["senators"] + [state["governor"] or {}]:
            if not valid_name(person.get("name", "")):
                problems.append("%s: bad name %r" % (code, person.get("name")))
        districts = [r["district"] for r in state["representatives"]]
        expected = [0] if SEATS[code] == 1 else list(range(1, SEATS[code] + 1))
        if districts != expected:
            problems.append("%s districts %s" % (code, districts))
        for rep in state["representatives"]:
            if not rep.get("vacant") and not valid_name(rep.get("name", "")):
                problems.append("%s-%s: bad name %r" % (code, rep["district"], rep.get("name")))
        seats += len(districts)
        if state["capital"] != CAPITALS[code]:
            problems.append("%s capital %r" % (code, state["capital"]))
    if seats != 435:
        problems.append("%d House seats" % seats)
    vacant = sum(1 for s in doc["states"].values() for r in s["representatives"] if r.get("vacant"))
    if vacant > 15:
        problems.append("%d vacant House seats looks wrong" % vacant)
    return problems


def content(doc):
    """The facts, without timestamps or which sources confirmed them: compared to see whether anything changed."""
    return {k: v for k, v in doc.items() if k not in ("generatedAt", "checkedAt", "sources", "factSources")}


def national_fact(run, key, build):
    try:
        return build()
    except SourceError as error:
        previous = run.previous_national(key)
        run.issue("%s: %s" % (key, error))
        if previous is None:
            raise SourceError("%s can't be confirmed and there is no previous value" % key)
        return previous


def build(previous):
    run = Run(previous)
    api_key = os.environ.get("CONGRESS_API_KEY") or "DEMO_KEY"

    legislators = fetch_json(URLS["legislators"])
    executive = fetch_json(URLS["executive"])
    congress_number, clerk_seats = clerk_house(fetch(URLS["clerk"]))

    def optional(label, load):
        try:
            return load()
        except (SourceError, ValueError, KeyError, ET.ParseError, tarfile.TarError) as error:
            (run.note if label in OPTIONAL_THIRD_SOURCES else run.issue)("%s unavailable: %s" % (label, error))
            return None

    whitehouse = optional("whitehouse.gov", lambda: page_lines(fetch(URLS["whitehouse"], browser=True)))
    speaker_page = optional("speaker.gov", lambda: fetch(URLS["speaker"], browser=True))
    scotus_page = optional("supremecourt.gov", lambda: fetch(URLS["scotus"], browser=True))
    wikidata = {key: optional("Wikidata " + key, lambda o=office: wikidata_holders(o))
                for key, office in WIKIDATA_OFFICES.items()}
    congress_api = optional("Congress.gov API", lambda: congress_members(api_key))
    wikidata_sens = None
    if congress_api is None:
        wikidata_sens = optional("Wikidata senators", wikidata_senators)
        if wikidata_sens is not None and len(wikidata_sens) < 95:
            run.issue("Wikidata lists %d senators: not used" % len(wikidata_sens))
            wikidata_sens = None
    openstates = optional("Open States", lambda: openstates_governors(run, fetch(URLS["openstates"], timeout=120)))

    def need(value, label):
        if value is None:
            raise SourceError(label + " unavailable")
        return value

    president = national_fact(run, "president", lambda: executive_fact(
        run, executive, need(whitehouse, "whitehouse.gov"), "prez", "President"))
    vice_president = national_fact(run, "vicePresident", lambda: executive_fact(
        run, executive, need(whitehouse, "whitehouse.gov"), "viceprez", "Vice President"))
    speaker = national_fact(run, "speaker", lambda: speaker_fact(
        run, need(speaker_page, "speaker.gov"), need(wikidata["speaker"], "Wikidata"), legislators))

    def court():
        return court_facts(run, need(scotus_page, "supremecourt.gov"),
                           need(wikidata["chiefJustice"], "Wikidata"), wikidata["associateJustice"] or [])

    try:
        chief_justice, justices = court()
    except SourceError as error:
        run.issue("chiefJustice: %s" % error)
        chief_justice = run.previous_national("chiefJustice")
        justices = run.previous_national("supremeCourtJustices")
        if chief_justice is None or justices is None:
            raise SourceError("the Chief Justice can't be confirmed and there is no previous value")

    # Wikidata also has to agree on the President and Vice President, when it answers.
    for key, person in (("president", president), ("vicePresident", vice_president)):
        holders = wikidata.get(key)
        if holders is not None and not any(same_person(h["name"], person["name"]) for h in holders):
            run.note("%s: Wikidata lists %s, kept %s" % (key, [h["name"] for h in holders], person["name"]))

    congress = congress_facts(run, legislators, clerk_seats, congress_api, wikidata_sens)
    governors = governor_facts(run, openstates)

    states = {}
    for code, name in STATES.items():
        states[code] = {
            "name": name,
            "capital": CAPITALS.get(code),
            "governor": governors[code],
            "senators": congress[code]["senators"],
            "representatives": congress[code]["representatives"],
            "delegate": congress[code]["delegate"],
        }

    doc = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": None,
        "checkedAt": None,
        "congress": congress_number,
        "national": {
            "president": president,
            "vicePresident": vice_president,
            "speaker": speaker,
            "chiefJustice": chief_justice,
            "presidentParty": president["party"],
            "supremeCourtSeats": SUPREME_COURT_SEATS,
            "supremeCourtJustices": justices,
        },
        "states": states,
    }
    # The two sources that confirmed each fact, the official one first.
    second_house = "congressgov" if congress_api is not None else "legislators"
    second_senate = "congressgov" if congress_api is not None else "wikidata"
    fact_sources = {
        "president": ["whitehouse", "legislators"],
        "vicePresident": ["whitehouse", "legislators"],
        "presidentParty": ["whitehouse", "legislators"],
        "speaker": ["speaker", "wikidata"],
        "chiefJustice": ["scotus", "wikidata"],
        "supremeCourtJustices": ["scotus"],
        "senators": ["legislators", second_senate] if second_senate == "wikidata" else [second_senate, "legislators"],
        "representatives": ["clerk", second_house],
        "governor": ["usagov", "openstates"],
    }
    used = []
    for ids in fact_sources.values():
        used.extend(i for i in ids if i not in used)
    doc["factSources"] = fact_sources
    doc["sources"] = [dict(id=i, **SOURCES[i]) for i in SOURCES if i in used]
    return run, doc


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--out", required=True)
    parser.add_argument("--previous")
    args = parser.parse_args()

    previous = None
    if args.previous and os.path.exists(args.previous):
        with open(args.previous, encoding="utf-8") as handle:
            previous = json.load(handle)
        if previous.get("schemaVersion") != SCHEMA_VERSION:
            previous = None

    try:
        run, doc = build(previous)
    except (SourceError, ValueError, KeyError, ET.ParseError) as error:
        print("FATAL: %s — nothing written" % error, file=sys.stderr)
        return 2

    problems = check_file(doc)
    if problems:
        for problem in problems:
            print("CHECK FAILED: " + problem, file=sys.stderr)
        print("Nothing written.", file=sys.stderr)
        return 2

    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")
    changed = previous is None or content(previous) != content(doc)
    doc["generatedAt"] = now if changed else previous.get("generatedAt", now)
    doc["checkedAt"] = now

    directory = os.path.dirname(os.path.abspath(args.out))
    os.makedirs(directory, exist_ok=True)
    temporary = args.out + ".tmp"
    with open(temporary, "w", encoding="utf-8") as handle:
        json.dump(doc, handle, ensure_ascii=False, indent=1, sort_keys=True)
        handle.write("\n")
    os.replace(temporary, args.out)

    if previous is not None and changed:
        print_changes(previous, doc)
    print("%s: %s, checked %s, %d issue(s)" % (args.out, "changed" if changed else "unchanged", now, len(run.issues)))
    if run.issues and "GITHUB_STEP_SUMMARY" in os.environ:
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as summary:
            summary.write("### Facts kept from the previous file\n\n")
            summary.writelines("- %s\n" % issue for issue in run.issues)
    return 1 if run.issues else 0


def print_changes(old, new):
    for key in ("president", "vicePresident", "speaker", "chiefJustice", "presidentParty", "supremeCourtJustices"):
        if old["national"].get(key) != new["national"].get(key):
            print("CHANGED national.%s: %s → %s" % (key, old["national"].get(key), new["national"].get(key)))
    for code, state in new["states"].items():
        before = old["states"].get(code, {})
        for key in ("governor", "senators", "representatives", "delegate", "capital"):
            if before.get(key) != state.get(key):
                print("CHANGED %s.%s" % (code, key))


if __name__ == "__main__":
    sys.exit(main())
