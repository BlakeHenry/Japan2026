# Japan 2026 — proposed schedules
#
# Machine-written by /overview/'s EXPORT: every schedule on the compare
# view except the main plan, committed so a fresh browser seeds them back.
# Do not edit by hand. Delete the file to drop every committed proposal.

{
  "version": 1,
  "proposals": [
    {
      "id": "main",
      "name": "Main plan",
      "doc": {
        "version": 1,
        "baseHash": "182fdd9a",
        "window": {
          "start": "2026-10-12",
          "end": "2026-10-27"
        },
        "baseHue": 12,
        "hueCount": 4,
        "stops": [
          {
            "id": "gap-0",
            "kind": "gap",
            "name": "In transit",
            "days": 2,
            "hue": 0,
            "trips": []
          },
          {
            "id": "tokyo",
            "kind": "stay",
            "source": {
              "path": "src/content/segments/01-tokyo.md",
              "frontmatter": "city: Tokyo\ncityJa: \"東京\"\nstart: 2026-10-13\nend: 2026-10-16\narrive:\n  - mode: flight\n    text: From Austin · AUS → DFW → HND · American, ~16h door to door\n    service: American\n    hours: 16\n    departs: 2026-10-12\n    arrives: 2026-10-13\n    lands: \"15:00\"\n  - mode: flight\n    text: From Denver · DEN → HND nonstop · United, ~12h\n    service: United\n    hours: 12\n    departs: 2026-10-13\n    arrives: 2026-10-14\nheroImage: ../../assets/segments/tokyo.jpg\nheroAlt: Shibuya scramble crossing lit up at night\ntagline: Neon, backstreets, and the best breakfast on earth",
              "body": "\nFour nights to land, get over the flight, and eat. Nothing booked yet.\n"
            },
            "name": "Tokyo",
            "cityJa": "東京",
            "days": 5,
            "hue": 12,
            "trips": [
              {
                "id": "ito",
                "source": {
                  "path": "src/content/daytrips/ito.md",
                  "frontmatter": "name: Ito\nparent: Tokyo\ncityJa: \"伊東\"\nnote: onsen day on the Izu coast\nthere:\n  - mode: train\n    text: Ltd Exp Odoriko · Tokyo → Ito · ~1h 40m\nback:\n  - mode: train\n    text: Ltd Exp Odoriko · Ito → Tokyo · ~1h 40m",
                  "body": "\nA seaside onsen town on the Izu coast, an easy run down from Tokyo and\nback for a soak and a fish lunch. Nothing booked yet.\n"
                },
                "name": "Ito",
                "day": 1,
                "matchKeys": [
                  "Ito"
                ],
                "explicitCities": false
              },
              {
                "id": "trip-msxwa29u-1",
                "name": "Nikko",
                "day": 2,
                "matchKeys": [
                  "Nikko"
                ],
                "explicitCities": false
              }
            ]
          },
          {
            "id": "kyoto",
            "kind": "stay",
            "source": {
              "path": "src/content/segments/03-kyoto.md",
              "frontmatter": "city: Kyoto\ncityJa: \"京都\"\nstart: 2026-10-19\nend: 2026-10-22\nheroImage: ../../assets/segments/kyoto.jpg\nheroAlt: The vermilion torii tunnel at Fushimi Inari, lantern overhead\ntagline: Temples, tea, and a thousand gates",
              "body": "\nFour nights in the old capital, with Nara and Uji each a short train away.\nNothing booked yet.\n"
            },
            "name": "Kyoto",
            "cityJa": "京都",
            "days": 4,
            "hue": 149.508,
            "trips": [
              {
                "id": "nara",
                "source": {
                  "path": "src/content/daytrips/nara.md",
                  "frontmatter": "name: Nara\nparent: Kyoto\ncityJa: \"奈良\"\nthere:\n  - mode: train\n    text: Kintetsu · Kyoto → Nara · ~35–45m\nback:\n  - mode: train\n    text: Kintetsu · Nara → Kyoto · ~35–45m",
                  "body": "\nThe deer, the Great Buddha, and the oldest of the old capitals — a short\ntrain from Kyoto. Nothing booked yet.\n"
                },
                "name": "Nara",
                "day": 2,
                "matchKeys": [
                  "Nara"
                ],
                "explicitCities": false
              },
              {
                "id": "uji",
                "source": {
                  "path": "src/content/daytrips/uji.md",
                  "frontmatter": "name: Uji\nparent: Kyoto\ncityJa: \"宇治\"\nthere:\n  - mode: local\n    text: JR Nara line rapid · Kyoto → Uji · ~20m\nback:\n  - mode: local\n    text: JR Nara line rapid · Uji → Kyoto · ~20m",
                  "body": "\nTea country between Kyoto and Nara — matcha at the source, and the temple\noff the ten-yen coin. Nothing booked yet.\n"
                },
                "name": "Shiga",
                "day": 1,
                "matchKeys": [
                  "Shiga"
                ],
                "explicitCities": false
              }
            ],
            "travelHours": 3.15
          },
          {
            "id": "osaka",
            "kind": "stay",
            "source": {
              "path": "src/content/segments/04-osaka.md",
              "frontmatter": "city: Osaka\ncityJa: \"大阪\"\nstart: 2026-10-23\nend: 2026-10-25\ntravelHours: 0.5\narrive:\n  - mode: train\n    text: JR Special Rapid · Kyoto → Osaka · ~30m\n    service: JR Special Rapid\n    hours: 0.5\nheroImage: ../../assets/segments/osaka.jpg\nheroAlt: Dotonbori at night, neon signs reflected in the canal\ntagline: Eat until it stops being funny",
              "body": "\nThree nights to close the trip out, with one day spent down the line at\nHimeji and Kobe, then back up to Tokyo on the 26th to fly home. Nothing\nbooked yet.\n"
            },
            "name": "Osaka",
            "cityJa": "大阪",
            "days": 3,
            "travelHours": 0.5,
            "hue": 287.016,
            "trips": [
              {
                "id": "himeji-kobe",
                "source": {
                  "path": "src/content/daytrips/himeji-kobe.md",
                  "frontmatter": "name: Himeji + Kobe\nparent: Osaka\ncityJa: \"姫路・神戸\"\nnote: one day, castle then harbour\ncities:\n  - Himeji\n  - Kobe\nthere:\n  - mode: train\n    text: Shinkansen · Shin-Osaka → Himeji · ~30m\nback:\n  - mode: train\n    text: JR Special Rapid · Kobe (Sannomiya) → Osaka · ~20m",
                  "body": "\nOne day down the San'yō line: Himeji's white castle in the morning, then\nback up to Kobe for the harbour and the beef. Nothing booked yet.\n"
                },
                "name": "Himeji + Kobe",
                "day": 0,
                "matchKeys": [
                  "Himeji",
                  "Kobe"
                ],
                "explicitCities": true
              },
              {
                "id": "trip-msxyyhvz-5",
                "name": "Hiroshima",
                "day": 1,
                "matchKeys": [
                  "Hiroshima"
                ],
                "explicitCities": false
              }
            ]
          },
          {
            "id": "tokyo-2",
            "kind": "stay",
            "source": {
              "path": "src/content/segments/05-tokyo-return.md",
              "frontmatter": "city: Tokyo\ncityJa: \"東京\"\nstart: 2026-10-26\nend: 2026-10-26\ntravelHours: 2.5\narrive:\n  - mode: train\n    text: Tokaido Shinkansen · Shin-Osaka → Tokyo · ~2h 30m\n    service: Tokaido Shinkansen\n    hours: 2.5\ndepart:\n  - mode: flight\n    text: To Austin · HND → DFW → AUS · placeholder\n    service: American\n    hours: 16\n  - mode: flight\n    text: To Denver · HND → SFO → DEN · placeholder\n    service: United\n    hours: 14\ntagline: One last night, then the long way home",
              "body": "\nBack up from Osaka to be near the airport for the flights out. The ideas and\nday trips all live on the first Tokyo stay — this one is a bed and a train to\nthe airport. Nothing booked yet.\n"
            },
            "name": "Tokyo",
            "cityJa": "東京",
            "days": 1,
            "travelHours": 3,
            "hue": 64.524,
            "trips": []
          },
          {
            "id": "gap-15",
            "kind": "gap",
            "name": "Heading home",
            "days": 1,
            "hue": 0,
            "trips": []
          }
        ]
      }
    },
    {
      "id": "variant-msxwnlls-2",
      "name": "Option B",
      "doc": {
        "version": 1,
        "baseHash": "182fdd9a",
        "window": {
          "start": "2026-10-12",
          "end": "2026-10-27"
        },
        "baseHue": 12,
        "hueCount": 5,
        "stops": [
          {
            "id": "gap-0",
            "kind": "gap",
            "name": "In transit",
            "days": 2,
            "hue": 0,
            "trips": []
          },
          {
            "id": "tokyo",
            "kind": "stay",
            "source": {
              "path": "src/content/segments/01-tokyo.md",
              "frontmatter": "city: Tokyo\ncityJa: \"東京\"\nstart: 2026-10-13\nend: 2026-10-16\narrive:\n  - mode: flight\n    text: From Austin · AUS → DFW → HND · American, ~16h door to door\n    service: American\n    hours: 16\n    departs: 2026-10-12\n    arrives: 2026-10-13\n    lands: \"15:00\"\n  - mode: flight\n    text: From Denver · DEN → HND nonstop · United, ~12h\n    service: United\n    hours: 12\n    departs: 2026-10-13\n    arrives: 2026-10-14\nheroImage: ../../assets/segments/tokyo.jpg\nheroAlt: Shibuya scramble crossing lit up at night\ntagline: Neon, backstreets, and the best breakfast on earth",
              "body": "\nFour nights to land, get over the flight, and eat. Nothing booked yet.\n"
            },
            "name": "Tokyo",
            "cityJa": "東京",
            "days": 5,
            "hue": 12,
            "trips": [
              {
                "id": "ito",
                "source": {
                  "path": "src/content/daytrips/ito.md",
                  "frontmatter": "name: Ito\nparent: Tokyo\ncityJa: \"伊東\"\nnote: onsen day on the Izu coast\nthere:\n  - mode: train\n    text: Ltd Exp Odoriko · Tokyo → Ito · ~1h 40m\nback:\n  - mode: train\n    text: Ltd Exp Odoriko · Ito → Tokyo · ~1h 40m",
                  "body": "\nA seaside onsen town on the Izu coast, an easy run down from Tokyo and\nback for a soak and a fish lunch. Nothing booked yet.\n"
                },
                "name": "Ito",
                "day": 1,
                "matchKeys": [
                  "Ito"
                ],
                "explicitCities": false
              },
              {
                "id": "trip-msxwa29u-1",
                "name": "Nikko",
                "day": 2,
                "matchKeys": [
                  "Nikko"
                ],
                "explicitCities": false
              }
            ]
          },
          {
            "id": "stop-msxwpltf-3",
            "kind": "stay",
            "name": "Fuji",
            "days": 1,
            "hue": 202.03200000000004,
            "trips": [],
            "travelHours": 2.2
          },
          {
            "id": "kyoto",
            "kind": "stay",
            "source": {
              "path": "src/content/segments/03-kyoto.md",
              "frontmatter": "city: Kyoto\ncityJa: \"京都\"\nstart: 2026-10-19\nend: 2026-10-22\nheroImage: ../../assets/segments/kyoto.jpg\nheroAlt: The vermilion torii tunnel at Fushimi Inari, lantern overhead\ntagline: Temples, tea, and a thousand gates",
              "body": "\nFour nights in the old capital, with Nara and Uji each a short train away.\nNothing booked yet.\n"
            },
            "name": "Kyoto",
            "cityJa": "京都",
            "days": 3,
            "hue": 149.508,
            "trips": [
              {
                "id": "nara",
                "source": {
                  "path": "src/content/daytrips/nara.md",
                  "frontmatter": "name: Nara\nparent: Kyoto\ncityJa: \"奈良\"\nthere:\n  - mode: train\n    text: Kintetsu · Kyoto → Nara · ~35–45m\nback:\n  - mode: train\n    text: Kintetsu · Nara → Kyoto · ~35–45m",
                  "body": "\nThe deer, the Great Buddha, and the oldest of the old capitals — a short\ntrain from Kyoto. Nothing booked yet.\n"
                },
                "name": "Nara",
                "day": 2,
                "matchKeys": [
                  "Nara"
                ],
                "explicitCities": false
              },
              {
                "id": "uji",
                "source": {
                  "path": "src/content/daytrips/uji.md",
                  "frontmatter": "name: Uji\nparent: Kyoto\ncityJa: \"宇治\"\nthere:\n  - mode: local\n    text: JR Nara line rapid · Kyoto → Uji · ~20m\nback:\n  - mode: local\n    text: JR Nara line rapid · Uji → Kyoto · ~20m",
                  "body": "\nTea country between Kyoto and Nara — matcha at the source, and the temple\noff the ten-yen coin. Nothing booked yet.\n"
                },
                "name": "Shiga",
                "day": 1,
                "matchKeys": [
                  "Shiga"
                ],
                "explicitCities": false
              }
            ],
            "travelHours": 3.7
          },
          {
            "id": "osaka",
            "kind": "stay",
            "source": {
              "path": "src/content/segments/04-osaka.md",
              "frontmatter": "city: Osaka\ncityJa: \"大阪\"\nstart: 2026-10-23\nend: 2026-10-25\ntravelHours: 0.5\narrive:\n  - mode: train\n    text: JR Special Rapid · Kyoto → Osaka · ~30m\n    service: JR Special Rapid\n    hours: 0.5\nheroImage: ../../assets/segments/osaka.jpg\nheroAlt: Dotonbori at night, neon signs reflected in the canal\ntagline: Eat until it stops being funny",
              "body": "\nThree nights to close the trip out, with one day spent down the line at\nHimeji and Kobe, then back up to Tokyo on the 26th to fly home. Nothing\nbooked yet.\n"
            },
            "name": "Osaka",
            "cityJa": "大阪",
            "days": 3,
            "travelHours": 0.5,
            "hue": 287.016,
            "trips": [
              {
                "id": "himeji-kobe",
                "source": {
                  "path": "src/content/daytrips/himeji-kobe.md",
                  "frontmatter": "name: Himeji + Kobe\nparent: Osaka\ncityJa: \"姫路・神戸\"\nnote: one day, castle then harbour\ncities:\n  - Himeji\n  - Kobe\nthere:\n  - mode: train\n    text: Shinkansen · Shin-Osaka → Himeji · ~30m\nback:\n  - mode: train\n    text: JR Special Rapid · Kobe (Sannomiya) → Osaka · ~20m",
                  "body": "\nOne day down the San'yō line: Himeji's white castle in the morning, then\nback up to Kobe for the harbour and the beef. Nothing booked yet.\n"
                },
                "name": "Himeji + Kobe",
                "day": 0,
                "matchKeys": [
                  "Himeji",
                  "Kobe"
                ],
                "explicitCities": true
              },
              {
                "id": "trip-msxyydtl-4",
                "name": "Hiroshima",
                "day": 1,
                "matchKeys": [
                  "Hiroshima"
                ],
                "explicitCities": false
              }
            ]
          },
          {
            "id": "tokyo-2",
            "kind": "stay",
            "source": {
              "path": "src/content/segments/05-tokyo-return.md",
              "frontmatter": "city: Tokyo\ncityJa: \"東京\"\nstart: 2026-10-26\nend: 2026-10-26\ntravelHours: 2.5\narrive:\n  - mode: train\n    text: Tokaido Shinkansen · Shin-Osaka → Tokyo · ~2h 30m\n    service: Tokaido Shinkansen\n    hours: 2.5\ndepart:\n  - mode: flight\n    text: To Austin · HND → DFW → AUS · placeholder\n    service: American\n    hours: 16\n  - mode: flight\n    text: To Denver · HND → SFO → DEN · placeholder\n    service: United\n    hours: 14\ntagline: One last night, then the long way home",
              "body": "\nBack up from Osaka to be near the airport for the flights out. The ideas and\nday trips all live on the first Tokyo stay — this one is a bed and a train to\nthe airport. Nothing booked yet.\n"
            },
            "name": "Tokyo",
            "cityJa": "東京",
            "days": 1,
            "travelHours": 3.25,
            "hue": 64.524,
            "trips": []
          },
          {
            "id": "gap-15",
            "kind": "gap",
            "name": "Heading home",
            "days": 1,
            "hue": 0,
            "trips": []
          }
        ]
      }
    },
    {
      "id": "variant-msxwb78t-1",
      "name": "Option A",
      "doc": {
        "version": 1,
        "baseHash": "182fdd9a",
        "window": {
          "start": "2026-10-12",
          "end": "2026-10-27"
        },
        "baseHue": 12,
        "hueCount": 7,
        "stops": [
          {
            "id": "gap-0",
            "kind": "gap",
            "name": "In transit",
            "days": 2,
            "hue": 0,
            "trips": []
          },
          {
            "id": "tokyo",
            "kind": "stay",
            "source": {
              "path": "src/content/segments/01-tokyo.md",
              "frontmatter": "city: Tokyo\ncityJa: \"東京\"\nstart: 2026-10-13\nend: 2026-10-16\narrive:\n  - mode: flight\n    text: From Austin · AUS → DFW → HND · American, ~16h door to door\n    service: American\n    hours: 16\n    departs: 2026-10-12\n    arrives: 2026-10-13\n    lands: \"15:00\"\n  - mode: flight\n    text: From Denver · DEN → HND nonstop · United, ~12h\n    service: United\n    hours: 12\n    departs: 2026-10-13\n    arrives: 2026-10-14\nheroImage: ../../assets/segments/tokyo.jpg\nheroAlt: Shibuya scramble crossing lit up at night\ntagline: Neon, backstreets, and the best breakfast on earth",
              "body": "\nFour nights to land, get over the flight, and eat. Nothing booked yet.\n"
            },
            "name": "Tokyo",
            "cityJa": "東京",
            "days": 4,
            "hue": 12,
            "trips": [
              {
                "id": "ito",
                "source": {
                  "path": "src/content/daytrips/ito.md",
                  "frontmatter": "name: Ito\nparent: Tokyo\ncityJa: \"伊東\"\nnote: onsen day on the Izu coast\nthere:\n  - mode: train\n    text: Ltd Exp Odoriko · Tokyo → Ito · ~1h 40m\nback:\n  - mode: train\n    text: Ltd Exp Odoriko · Ito → Tokyo · ~1h 40m",
                  "body": "\nA seaside onsen town on the Izu coast, an easy run down from Tokyo and\nback for a soak and a fish lunch. Nothing booked yet.\n"
                },
                "name": "Ito",
                "day": 1,
                "matchKeys": [
                  "Ito"
                ],
                "explicitCities": false
              },
              {
                "id": "trip-msxwa29u-1",
                "name": "Nikko",
                "day": 2,
                "matchKeys": [
                  "Nikko"
                ],
                "explicitCities": false
              }
            ]
          },
          {
            "id": "stop-msxy1pv0-5",
            "kind": "stay",
            "name": "Fuji",
            "days": 1,
            "hue": 117.048,
            "trips": [],
            "travelHours": 2.2
          },
          {
            "id": "stop-msxwrjf3-4",
            "kind": "stay",
            "name": "Fukuoka",
            "days": 2,
            "hue": 339.5400000000001,
            "trips": [
              {
                "id": "nara",
                "source": {
                  "path": "src/content/daytrips/nara.md",
                  "frontmatter": "name: Nara\nparent: Kyoto\ncityJa: \"奈良\"\nthere:\n  - mode: train\n    text: Kintetsu · Kyoto → Nara · ~35–45m\nback:\n  - mode: train\n    text: Kintetsu · Nara → Kyoto · ~35–45m",
                  "body": "\nThe deer, the Great Buddha, and the oldest of the old capitals — a short\ntrain from Kyoto. Nothing booked yet.\n"
                },
                "name": "Nara",
                "day": 1,
                "matchKeys": [
                  "Nara"
                ],
                "explicitCities": false
              },
              {
                "id": "uji",
                "source": {
                  "path": "src/content/daytrips/uji.md",
                  "frontmatter": "name: Uji\nparent: Kyoto\ncityJa: \"宇治\"\nthere:\n  - mode: local\n    text: JR Nara line rapid · Kyoto → Uji · ~20m\nback:\n  - mode: local\n    text: JR Nara line rapid · Uji → Kyoto · ~20m",
                  "body": "\nTea country between Kyoto and Nara — matcha at the source, and the temple\noff the ten-yen coin. Nothing booked yet.\n"
                },
                "name": "Shiga",
                "day": 0,
                "matchKeys": [
                  "Shiga"
                ],
                "explicitCities": false
              }
            ],
            "travelHours": 6.58
          },
          {
            "id": "osaka",
            "kind": "stay",
            "source": {
              "path": "src/content/segments/04-osaka.md",
              "frontmatter": "city: Osaka\ncityJa: \"大阪\"\nstart: 2026-10-23\nend: 2026-10-25\ntravelHours: 0.5\narrive:\n  - mode: train\n    text: JR Special Rapid · Kyoto → Osaka · ~30m\n    service: JR Special Rapid\n    hours: 0.5\nheroImage: ../../assets/segments/osaka.jpg\nheroAlt: Dotonbori at night, neon signs reflected in the canal\ntagline: Eat until it stops being funny",
              "body": "\nThree nights to close the trip out, with one day spent down the line at\nHimeji and Kobe, then back up to Tokyo on the 26th to fly home. Nothing\nbooked yet.\n"
            },
            "name": "Kyoto/Osaka",
            "cityJa": "大阪",
            "days": 5,
            "travelHours": 0.5,
            "hue": 287.016,
            "trips": [
              {
                "id": "himeji-kobe",
                "source": {
                  "path": "src/content/daytrips/himeji-kobe.md",
                  "frontmatter": "name: Himeji + Kobe\nparent: Osaka\ncityJa: \"姫路・神戸\"\nnote: one day, castle then harbour\ncities:\n  - Himeji\n  - Kobe\nthere:\n  - mode: train\n    text: Shinkansen · Shin-Osaka → Himeji · ~30m\nback:\n  - mode: train\n    text: JR Special Rapid · Kobe (Sannomiya) → Osaka · ~20m",
                  "body": "\nOne day down the San'yō line: Himeji's white castle in the morning, then\nback up to Kobe for the harbour and the beef. Nothing booked yet.\n"
                },
                "name": "Himeji + Kobe",
                "day": 1,
                "matchKeys": [
                  "Himeji",
                  "Kobe"
                ],
                "explicitCities": true
              },
              {
                "id": "trip-msxyy7rb-3",
                "name": "Hiroshima",
                "day": 3,
                "matchKeys": [
                  "Hiroshima"
                ],
                "explicitCities": false
              }
            ]
          },
          {
            "id": "tokyo-2",
            "kind": "stay",
            "source": {
              "path": "src/content/segments/05-tokyo-return.md",
              "frontmatter": "city: Tokyo\ncityJa: \"東京\"\nstart: 2026-10-26\nend: 2026-10-26\ntravelHours: 2.5\narrive:\n  - mode: train\n    text: Tokaido Shinkansen · Shin-Osaka → Tokyo · ~2h 30m\n    service: Tokaido Shinkansen\n    hours: 2.5\ndepart:\n  - mode: flight\n    text: To Austin · HND → DFW → AUS · placeholder\n    service: American\n    hours: 16\n  - mode: flight\n    text: To Denver · HND → SFO → DEN · placeholder\n    service: United\n    hours: 14\ntagline: One last night, then the long way home",
              "body": "\nBack up from Osaka to be near the airport for the flights out. The ideas and\nday trips all live on the first Tokyo stay — this one is a bed and a train to\nthe airport. Nothing booked yet.\n"
            },
            "name": "Tokyo",
            "cityJa": "東京",
            "days": 1,
            "travelHours": 3,
            "hue": 64.524,
            "trips": []
          },
          {
            "id": "gap-15",
            "kind": "gap",
            "name": "Heading home",
            "days": 1,
            "hue": 0,
            "trips": []
          }
        ]
      }
    }
  ]
}
