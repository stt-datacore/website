const Optimizer = {
  saveFile: {},
  rosterLibrary: {},
  rosterArray: [],
  skillPairingsArray: [
    "command/diplomacy",
    "command/engineering",
    "command/medicine",
    "command/science",
    "command/security",
    "diplomacy/command",
    "diplomacy/engineering",
    "diplomacy/medicine",
    "diplomacy/science",
    "diplomacy/security",
    "engineering/command",
    "engineering/diplomacy",
    "engineering/medicine",
    "engineering/science",
    "engineering/security",
    //"expectedVoyage",
    "medicine/command",
    "medicine/diplomacy",
    "medicine/engineering",
    "medicine/science",
    "medicine/security",
    "science/command",
    "science/diplomacy",
    "science/engineering",
    "science/medicine",
    "science/security",
    "security/command",
    "security/diplomacy",
    "security/engineering",
    "security/medicine",
    "security/science"
  ],
  voyageSkillRankings: {
    currentRarity: {
      "command/diplomacy": [],
      "command/engineering": [],
      "command/medicine": [],
      "command/science": [],
      "command/security": [],
      "diplomacy/command": [],
      "diplomacy/engineering": [],
      "diplomacy/medicine": [],
      "diplomacy/science": [],
      "diplomacy/security": [],
      "engineering/command": [],
      "engineering/diplomacy": [],
      "engineering/medicine": [],
      "engineering/science": [],
      "engineering/security": [],
      "expectedVoyage": [],
      "medicine/command": [],
      "medicine/diplomacy": [],
      "medicine/engineering": [],
      "medicine/science": [],
      "medicine/security": [],
      "science/command": [],
      "science/diplomacy": [],
      "science/engineering": [],
      "science/medicine": [],
      "science/security": [],
      "security/command": [],
      "security/diplomacy": [],
      "security/engineering": [],
      "security/medicine": [],
      "security/science": [],
    },
    fullyCited: {
      "command/diplomacy": [],
      "command/engineering": [],
      "command/medicine": [],
      "command/science": [],
      "command/security": [],
      "diplomacy/command": [],
      "diplomacy/engineering": [],
      "diplomacy/medicine": [],
      "diplomacy/science": [],
      "diplomacy/security": [],
      "engineering/command": [],
      "engineering/diplomacy": [],
      "engineering/medicine": [],
      "engineering/science": [],
      "engineering/security": [],
      "expectedVoyage": [],
      "medicine/command": [],
      "medicine/diplomacy": [],
      "medicine/engineering": [],
      "medicine/science": [],
      "medicine/security": [],
      "science/command": [],
      "science/diplomacy": [],
      "science/engineering": [],
      "science/medicine": [],
      "science/security": [],
      "security/command": [],
      "security/diplomacy": [],
      "security/engineering": [],
      "security/medicine": [],
      "security/science": [],
    }
  },
  voyageSkillPools: {
    //Full Pool
    "voyageCrew": {
      signature: "voyageCrew",
      seats: 12,
      assignedCrew: [],
      full: false,
      superSets: [],
      subSets: [
        "command/diplomacy/engineering/medicine/science",
        "command/diplomacy/engineering/medicine/security",
        "command/diplomacy/engineering/science/security",
        "command/diplomacy/medicine/science/security",
        "command/engineering/medicine/science/security",
        "diplomacy/engineering/medicine/science/security"
      ]
    },
    //Pools of 5 Skills
    "command/diplomacy/engineering/medicine/science": {
      signature: "command/diplomacy/engineering/medicine/science",
      seats: 10,
      assignedCrew: [],
      full: false,
      superSets: ["voyageCrew"],
      subSets: [
        "command/diplomacy/engineering/medicine",
        "command/diplomacy/engineering/science",
        "command/diplomacy/medicine/science",
        "command/engineering/medicine/science",
        "diplomacy/engineering/medicine/science"
      ]
    },
    "command/diplomacy/engineering/medicine/security": {
      signature: "command/diplomacy/engineering/medicine/security",
      seats: 10,
      assignedCrew: [],
      full: false,
      superSets: ["voyageCrew"],
      subSets: [
        "command/diplomacy/engineering/medicine",
        "command/diplomacy/engineering/security",
        "command/diplomacy/medicine/security",
        "command/engineering/medicine/security",
        "diplomacy/engineering/medicine/security"
      ]
    },
    "command/diplomacy/engineering/science/security": {
      signature: "command/diplomacy/engineering/science/security",
      seats: 10,
      assignedCrew: [],
      full: false,
      superSets: ["voyageCrew"],
      subSets: [
        "command/diplomacy/engineering/science",
        "command/diplomacy/engineering/security",
        "command/diplomacy/science/security",
        "command/engineering/science/security",
        "diplomacy/engineering/science/security"
      ]
    },
    "command/diplomacy/medicine/science/security": {
      signature: "command/diplomacy/medicine/science/security",
      seats: 10,
      assignedCrew: [],
      full: false,
      superSets: ["voyageCrew"],
      subSets: [
        "command/diplomacy/medicine/science",
        "command/diplomacy/medicine/security",
        "command/diplomacy/science/security",
        "command/medicine/science/security",
        "diplomacy/medicine/science/security"
      ]
    },
    "command/engineering/medicine/science/security": {
      signature: "command/engineering/medicine/science/security",
      seats: 10,
      assignedCrew: [],
      full: false,
      superSets: ["voyageCrew"],
      subSets: [
        "command/engineering/medicine/science",
        "command/engineering/medicine/security",
        "command/engineering/science/security",
        "command/medicine/science/security",
        "engineering/medicine/science/security"
      ]
    },
    "diplomacy/engineering/medicine/science/security": {
      signature: "diplomacy/engineering/medicine/science/security",
      seats: 10,
      assignedCrew: [],
      full: false,
      superSets: ["voyageCrew"],
      subSets: [
        "diplomacy/engineering/medicine/science",
        "diplomacy/engineering/medicine/security",
        "diplomacy/engineering/science/security",
        "diplomacy/medicine/science/security",
        "engineering/medicine/science/security"
      ]
    },
    //Pools of 4 skills - "command/diplomacy/engineering/medicine/science"
    "command/diplomacy/engineering/medicine": {
      signature: "command/diplomacy/engineering/medicine",
      seats: 8,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/engineering/medicine/science",
        "command/diplomacy/engineering/medicine/security"
      ],
      subSets: [
        "command/diplomacy/engineering",
        "command/diplomacy/medicine",
        "command/engineering/medicine",
        "diplomacy/engineering/medicine"
      ]
    },
    "command/diplomacy/engineering/science": {
      signature: "command/diplomacy/engineering/science",
      seats: 8,
      assignedCrew: [],
      full: false,
      superSets: ["command/diplomacy/engineering/medicine/science", "command/diplomacy/engineering/science/security"],
      subSets: [
        "command/diplomacy/engineering",
        "command/diplomacy/science",
        "command/engineering/science",
        "diplomacy/engineering/science"
      ]
    },
    "command/diplomacy/medicine/science": {
      signature: "command/diplomacy/medicine/science",
      seats: 8,
      assignedCrew: [],
      full: false,
      superSets: ["command/diplomacy/engineering/medicine/science", "command/diplomacy/medicine/science/security"],
      subSets: [
        "command/diplomacy/medicine",
        "command/diplomacy/science",
        "command/medicine/science",
        "diplomacy/medicine/science"
      ]
    },
    "command/engineering/medicine/science": {
      signature: "command/engineering/medicine/science",
      seats: 8,
      assignedCrew: [],
      full: false,
      superSets: ["command/diplomacy/engineering/medicine/science", "command/engineering/medicine/science/security"],
      subSets: [
        "command/engineering/medicine",
        "command/engineering/science",
        "command/medicine/science",
        "engineering/medicine/science"
      ]
    },
    "diplomacy/engineering/medicine/science": {
      signature: "command/engineering/medicine/science",
      seats: 8,
      assignedCrew: [],
      full: false,
      superSets: ["command/diplomacy/engineering/medicine/science", "diplomacy/engineering/medicine/science/security"],
      subSets: [
        "diplomacy/engineering/medicine",
        "diplomacy/engineering/science",
        "diplomacy/medicine/science",
        "engineering/medicine/science"
      ]
    },
    //Pools of 4 skills - "command/diplomacy/engineering/medicine/security"
    "command/diplomacy/engineering/security": {
      signature: "command/diplomacy/engineering/security",
      seats: 8,
      assignedCrew: [],
      full: false,
      superSets: ["command/diplomacy/engineering/medicine/security", "command/diplomacy/engineering/science/security"],
      subSets: [
        "command/diplomacy/engineering",
        "command/diplomacy/security",
        "command/engineering/security",
        "diplomacy/engineering/security"
      ]
    },
    "command/diplomacy/medicine/security": {
      signature: "command/diplomacy/medicine/security",
      seats: 8,
      assignedCrew: [],
      full: false,
      superSets: ["command/diplomacy/engineering/medicine/security", "command/diplomacy/medicine/science/security"],
      subSets: [
        "command/diplomacy/medicine",
        "command/diplomacy/security",
        "command/medicine/security",
        "diplomacy/medicine/security"
      ]
    },
    "command/engineering/medicine/security": {
      signature: "command/engineering/medicine/security",
      seats: 8,
      assignedCrew: [],
      full: false,
      superSets: ["command/diplomacy/engineering/medicine/security", "command/engineering/medicine/science/security"],
      subSets: [
        "command/engineering/medicine",
        "command/engineering/security",
        "command/medicine/security",
        "engineering/medicine/security"
      ]
    },
    "diplomacy/engineering/medicine/security": {
      signature: "diplomacy/engineering/medicine/security",
      seats: 8,
      assignedCrew: [],
      full: false,
      superSets: ["command/diplomacy/engineering/medicine/security", "command/engineering/medicine/science/security"],
      subSets: [
        "diplomacy/engineering/medicine",
        "diplomacy/engineering/security",
        "diplomacy/medicine/security",
        "engineering/medicine/security"
      ]
    },
    //Pools of 4 skills - "command/diplomacy/engineering/science/security"
    "command/diplomacy/science/security": {
      signature: "command/diplomacy/science/security",
      seats: 8,
      assignedCrew: [],
      full: false,
      superSets: ["command/diplomacy/engineering/science/security", "command/diplomacy/medicine/science/security"],
      subSets: [
        "command/diplomacy/science",
        "command/diplomacy/security",
        "command/science/security",
        "diplomacy/science/security"
      ]
    },
    "command/engineering/science/security": {
      signature: "command/engineering/science/security",
      seats: 8,
      assignedCrew: [],
      full: false,
      superSets: ["command/diplomacy/engineering/science/security", "command/engineering/medicine/science/security"],
      subSets: [
        "command/engineering/science",
        "command/engineering/security",
        "command/science/security",
        "engineering/science/security"
      ]
    },
    "diplomacy/engineering/science/security": {
      signature: "diplomacy/engineering/science/security",
      seats: 8,
      assignedCrew: [],
      full: false,
      superSets: ["command/diplomacy/engineering/science/security", "diplomacy/engineering/medicine/science/security"],
      subSets: [
        "diplomacy/engineering/science",
        "diplomacy/engineering/security",
        "diplomacy/science/security",
        "engineering/science/security"
      ]
    },
    //Pools of 4 skills - "command/diplomacy/medicine/science/security"
    "command/medicine/science/security": {
      signature: "command/medicine/science/security",
      seats: 8,
      assignedCrew: [],
      full: false,
      superSets: ["command/diplomacy/medicine/science/security", "command/engineering/medicine/science/security"],
      subSets: [
        "command/medicine/science",
        "command/medicine/security",
        "command/science/security",
        "medicine/science/security"
      ]
    },
    "diplomacy/medicine/science/security": {
      signature: "diplomacy/medicine/science/security",
      seats: 8,
      assignedCrew: [],
      full: false,
      superSets: ["command/diplomacy/medicine/science/security", "diplomacy/engineering/medicine/science/security"],
      subSets: [
        "diplomacy/medicine/science",
        "diplomacy/medicine/security",
        "diplomacy/science/security",
        "medicine/science/security"
      ]
    },
    //Pools of 4 skills - "command/engineering/medicine/science/security"
    "engineering/medicine/science/security": {
      signature: "engineering/medicine/science/security",
      seats: 8,
      assignedCrew: [],
      full: false,
      superSets: ["command/engineering/medicine/science/security", "diplomacy/engineering/medicine/science/security"],
      subSets: [
        "engineering/medicine/science",
        "engineering/medicine/security",
        "engineering/science/security",
        "medicine/science/security"
      ]
    },
    //Pools of 3 Skills
    "command/diplomacy/engineering": {
      signature: "command/diplomacy/engineering",
      seats: 6,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/engineering/medicine",
        "command/diplomacy/engineering/science",
        "command/diplomacy/engineering/security"
      ],
      subSets: [
        "command/diplomacy",
        "command/engineering",
        "diplomacy/engineering"
      ]
    },
    "command/diplomacy/medicine": {
      signature: "command/diplomacy/medicine",
      seats: 6,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/engineering/medicine",
        "command/diplomacy/medicine/science",
        "command/diplomacy/medicine/security"
      ],
      subSets: [
        "command/diplomacy",
        "command/medicine",
        "diplomacy/medicine"
      ]
    },
    "command/diplomacy/science": {
      signature: "command/diplomacy/science",
      seats: 6,
      assignedCrew: [],
      superSets: [
        "command/diplomacy/engineering/science",
        "command/diplomacy/medicine/science",
        "command/diplomacy/science/security"
      ],
      subSets: [
        "command/diplomacy",
        "command/science",
        "diplomacy/science"
      ]
    },
    "command/diplomacy/security": {
      signature: "command/diplomacy/security",
      seats: 6,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/engineering/security",
        "command/diplomacy/medicine/security",
        "command/diplomacy/science/security"
      ],
      subSets: [
        "command/diplomacy",
        "command/security",
        "diplomacy/security"
      ]
    },
    "command/engineering/medicine": {
      signature: "command/engineering/medicine",
      seats: 6,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/engineering/medicine",
        "command/engineering/medicine/science",
        "command/engineering/medicine/security"
      ],
      subSets: [
        "command/engineering",
        "command/medicine",
        "engineering/medicine"
      ]
    },
    "command/engineering/science": {
      signature: "command/engineering/science",
      seats: 6,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/engineering/science",
        "command/engineering/medicine/science",
        "command/engineering/science/security"
      ],
      subSets: [
        "command/engineering",
        "command/science",
        "engineering/science"
      ]
    },
    "command/engineering/security": {
      signature: "command/engineering/security",
      seats: 6,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/engineering/security",
        "command/engineering/medicine/security",
        "command/engineering/science/security"
      ],
      subSets: [
        "command/engineering",
        "command/security",
        "engineering/security"
      ]
    },
    "command/medicine/science": {
      signature: "command/medicine/science",
      seats: 6,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/medicine/science",
        "command/engineering/medicine/science",
        "command/medicine/science/security"
      ],
      subSets: [
        "command/medicine",
        "command/science",
        "medicine/science"
      ]
    },
    "command/medicine/security": {
      signature: "command/medicine/security",
      seats: 6,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/medicine/security",
        "command/engineering/medicine/security",
        "command/medicine/science/security"
      ],
      subSets: [
        "command/medicine",
        "command/security",
        "medicine/security"
      ]
    },
    "command/science/security": {
      signature: "command/science/security",
      seats: 6,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/science/security",
        "command/engineering/science/security",
        "command/medicine/science/security"
      ],
      subSets: [
        "command/science",
        "command/security",
        "science/security"
      ]
    },
    "diplomacy/engineering/medicine": {
      signature: "diplomacy/engineering/medicine",
      seats: 6,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/engineering/medicine",
        "diplomacy/engineering/medicine/science",
        "diplomacy/engineering/medicine/security"
      ],
      subSets: [
        "diplomacy/engineering",
        "diplomacy/medicine",
        "engineering/medicine"
      ]
    },
    "diplomacy/engineering/science": {
      signature: "diplomacy/engineering/science",
      seats: 6,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/engineering/science",
        "diplomacy/engineering/medicine/science",
        "diplomacy/engineering/science/security"
      ],
      subSets: [
        "diplomacy/engineering",
        "diplomacy/science",
        "engineering/science"
      ]
    },
    "diplomacy/engineering/security": {
      signature: "diplomacy/engineering/security",
      seats: 6,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/engineering/security",
        "diplomacy/engineering/medicine/security",
        "diplomacy/engineering/science/security"
      ],
      subSets: [
        "diplomacy/engineering",
        "diplomacy/security",
        "engineering/security"
      ]
    },
    "diplomacy/medicine/science": {
      signature: "diplomacy/medicine/science",
      seats: 6,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/medicine/science",
        "diplomacy/engineering/medicine/science",
        "diplomacy/medicine/science/security"
      ],
      subSets: [
        "diplomacy/medicine",
        "diplomacy/science",
        "medicine/science"
      ]
    },
    "diplomacy/medicine/security": {
      signature: "diplomacy/medicine/security",
      seats: 6,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/medicine/security",
        "diplomacy/engineering/medicine/security",
        "diplomacy/medicine/science/security"
      ],
      subSets: [
        "diplomacy/medicine",
        "diplomacy/security",
        "medicine/security"
      ]
    },
    "diplomacy/science/security": {
      signature: "diplomacy/science/security",
      seats: 6,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/science/security",
        "diplomacy/engineering/science/security",
        "diplomacy/medicine/science/security"
      ],
      subSets: [
        "diplomacy/science",
        "diplomacy/security",
        "science/security"
      ]
    },
    "engineering/medicine/science": {
      signature: "engineering/medicine/science",
      seats: 6,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/engineering/medicine/science",
        "diplomacy/engineering/medicine/science",
        "engineering/medicine/science/security"
      ],
      subSets: [
        "engineering/medicine",
        "engineering/science",
        "medicine/science"
      ]
    },
    "engineering/medicine/security": {
      signature: "engineering/medicine/security",
      seats: 6,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/engineering/medicine/security",
        "diplomacy/engineering/medicine/security",
        "engineering/medicine/science/security"
      ],
      subSets: [
        "engineering/medicine",
        "engineering/security",
        "medicine/security"
      ]
    },
    "engineering/science/security": {
      signature: "engineering/science/security",
      seats: 6,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/engineering/science/security",
        "diplomacy/engineering/science/security",
        "engineering/medicine/science/security"
      ],
      subSets: [
        "engineering/science",
        "engineering/security",
        "science/security"
      ]
    },
    "medicine/science/security": {
      signature: "medicine/science/security",
      seats: 6,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/medicine/science/security",
        "diplomacy/medicine/science/security",
        "engineering/medicine/science/security"
      ],
      subSets: [
        "medicine/science",
        "medicine/security",
        "science/security"
      ]
    },
    //Pools of 2 skills
    "command/diplomacy": {
      signature: "command/diplomacy",
      seats: 4,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/engineering",
        "command/diplomacy/medicine",
        "command/diplomacy/science",
        "command/diplomacy/security"
      ],
      subSets: ["command", "security"]
    },
    "command/engineering": {
      signature: "command/engineering",
      seats: 4,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/engineering",
        "command/engineering/medicine",
        "command/engineering/science",
        "command/engineering/security"
      ],
      subSets: ["command", "engineering"]
    },
    "command/medicine": {
      signature: "command/medicine",
      seats: 4,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/engineering",
        "command/engineering/medicine",
        "command/engineering/science",
        "command/engineering/security"
      ],
      subSets: [
        "command",
        "engineering"
      ]
    },
    "command/science": {
      signature: "command/science",
      seats: 4,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/science",
        "command/engineering/science",
        "command/medicine/science",
        "command/science/security"
      ],
      subSets: ["command", "science"]
    },
    "command/security": {
      signature: "command/security",
      seats: 4,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/security",
        "command/engineering/security",
        "command/medicine/security",
        "command/science/security"
      ],
      subSets: [
        "command",
        "security"
      ]
    },
    "diplomacy/engineering": {
      signature: "diplomacy/engineering",
      seats: 4,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/engineering",
        "diplomacy/engineering/medicine",
        "diplomacy/engineering/science",
        "diplomacy/engineering/security"
      ],
      subSets: [
        "diplomacy",
        "engineering"
      ]
    },
    "diplomacy/medicine": {
      signature: "diplomacy/medicine",
      seats: 4,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/medicine",
        "diplomacy/engineering/medicine",
        "diplomacy/medicine/science",
        "diplomacy/medicine/security"
      ],
      subSets: [
        "diplomacy",
        "medicine"
      ]
    },
    "diplomacy/science": {
      signature: "diplomacy/science",
      seats: 4,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/science",
        "diplomacy/engineering/science",
        "diplomacy/medicine/science",
        "diplomacy/science/security"
      ],
      subSets: [
        "diplomacy",
        "science"
      ]
    },
    "diplomacy/security": {
      signature: "diplomacy/security",
      seats: 4,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy/security",
        "diplomacy/engineering/security",
        "diplomacy/medicine/security",
        "diplomacy/science/security"
      ],
      subSets: [
        "diplomacy",
        "security"
      ]
    },
    "engineering/medicine": {
      signature: "engineering/medicine",
      seats: 4,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/engineering/medicine",
        "diplomacy/engineering/medicine",
        "engineering/medicine/science",
        "engineering/medicine/security"
      ],
      subSets: [
        "engineering",
        "medicine"
      ]
    },
    "engineering/science": {
      signature: "engineering/science",
      seats: 4,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/engineering/science",
        "diplomacy/engineering/science",
        "engineering/medicine/science",
        "engineering/science/security"
      ],
      subSets: [
        "engineering",
        "science"
      ]
    },
    "engineering/security": {
      signature: "engineering/security",
      seats: 4,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/engineering/security",
        "diplomacy/engineering/security",
        "engineering/medicine/security",
        "engineering/science/security"
      ],
      subSets: [
        "engineering",
        "security"
      ]
    },
    "medicine/science": {
      signature: "medicine/science",
      seats: 4,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/medicine/science",
        "diplomacy/medicine/science",
        "engineering/medicine/science",
        "medicine/science/security"
      ],
      subSets: [
        "medicine",
        "science"
      ]
    },
    "medicine/security": {
      signature: "medicine/security",
      seats: 4,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/medicine/security",
        "diplomacy/medicine/security",
        "engineering/medicine/security",
        "medicine/science/security"
      ],
      subSets: [
        "medicine",
        "security"
      ]
    },
    "science/security": {
      signature: "science/security",
      seats: 4,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/science/security",
        "diplomacy/science/security",
        "engineering/science/security",
        "medicine/science/security"
      ],
      subSets: [
        "science",
        "security"
      ]
    },
    //Pools of 1 skill
    "command": {
      signature: "command",
      seats: 2,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy",
        "command/engineering",
        "command/medicine",
        "command/science",
        "command/security"
      ],
      subSets: []
    },
    "diplomacy": {
      signature: "diplomacy",
      seats: 2,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/diplomacy",
        "diplomacy/engineering",
        "diplomacy/medicine",
        "diplomacy/science",
        "diplomacy/security"
      ],
      subSets: []
    },
    "engineering": {
      signature: "engineering",
      seats: 2,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/engineering",
        "diplomacy/engineering",
        "engineering/medicine",
        "engineering/science",
        "engineering/security"
      ],
      subSets: []
    },
    "medicine": {
      signature: "medicine",
      seats: 2,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/medicine",
        "diplomacy/medicine",
        "engineering/medicine",
        "medicine/science",
        "medicine/security"
      ],
      subSets: []
    },
    "science": {
      signature: "science",
      seats: 2,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/science",
        "diplomacy/science",
        "engineering/science",
        "medicine/science",
        "science/security"
      ],
      subSets: []
    },
    "security": {
      signature: "security",
      seats: 2,
      assignedCrew: [],
      full: false,
      superSets: [
        "command/security",
        "diplomacy/security",
        "engineering/security",
        "medicine/security",
        "science/security"
      ],
      subSets: []
    }
  },
  topVoyageCrews: {
    currentBest: {
      "command/diplomacy": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "command/engineering": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "command/medicine": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "command/science": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "command/security": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "diplomacy/command": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "diplomacy/engineering": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "diplomacy/medicine": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "diplomacy/science": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "diplomacy/security": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "engineering/command": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "engineering/diplomacy": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "engineering/medicine": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "engineering/science": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "engineering/security": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "medicine/command": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "medicine/diplomacy": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "medicine/engineering": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "medicine/science": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "medicine/security": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "science/command": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "science/diplomacy": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "science/engineering": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "science/medicine": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "science/security": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "security/command": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "security/diplomacy": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "security/engineering": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "security/medicine": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "security/science": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      }
    },
    rarityBest: {
      "command/diplomacy": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "command/engineering": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "command/medicine": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "command/science": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "command/security": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "diplomacy/command": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "diplomacy/engineering": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "diplomacy/medicine": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "diplomacy/science": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "diplomacy/security": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "engineering/command": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "engineering/diplomacy": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "engineering/medicine": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "engineering/science": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "engineering/security": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "medicine/command": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "medicine/diplomacy": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "medicine/engineering": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "medicine/science": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "medicine/security": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "science/command": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "science/diplomacy": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "science/engineering": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "science/medicine": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "science/security": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "security/command": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "security/diplomacy": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "security/engineering": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "security/medicine": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "security/science": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      }
    },
    citedBest: {
      "command/diplomacy": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "command/engineering": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "command/medicine": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "command/science": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "command/security": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "diplomacy/command": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "diplomacy/engineering": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "diplomacy/medicine": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "diplomacy/science": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "diplomacy/security": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "engineering/command": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "engineering/diplomacy": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "engineering/medicine": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "engineering/science": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "engineering/security": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "medicine/command": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "medicine/diplomacy": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "medicine/engineering": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "medicine/science": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "medicine/security": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "science/command": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "science/diplomacy": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "science/engineering": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "science/medicine": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "science/security": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "security/command": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "security/diplomacy": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "security/engineering": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "security/medicine": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      },
      "security/science": {
        crew: [],
        seatAssignments: {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        },
        assignmentErrors: [],
        skillTotals: {
          command_skill: 0,
          diplomacy_skill: 0,
          engineering_skill: 0,
          medicine_skill: 0,
          science_skill: 0,
          security_skill: 0
        },
        totalEV: 0
      }
    }
  },
  topCrewToTrain: {},
  topCrewToCite: {},
  rankedCrewToTrain: [],
  rankedCrewToCite: [],
  bestPossibleCrew: {
    gauntlet: {
      "command/diplomacy": {
        name: "",
        gauntletPairingEV: 0
      },
      "command/engineering": {
        name: "",
        gauntletPairingEV: 0
      },
      "command/medicine": {
        name: "",
        gauntletPairingEV: 0
      },
      "command/science": {
        name: "",
        gauntletPairingEV: 0
      },
      "command/security": {
        name: "",
        gauntletPairingEV: 0
      },
      "diplomacy/engineering": {
        name: "",
        gauntletPairingEV: 0
      },
      "diplomacy/medicine": {
        name: "",
        gauntletPairingEV: 0
      },
      "diplomacy/science": {
        name: "",
        gauntletPairingEV: 0
      },
      "diplomacy/security": {
        name: "",
        gauntletPairingEV: 0
      },
      "engineering/medicine": {
        name: "",
        gauntletPairingEV: 0
      },
      "engineering/science": {
        name: "",
        gauntletPairingEV: 0
      },
      "engineering/security": {
        name: "",
        gauntletPairingEV: 0
      },
      "medicine/science": {
        name: "",
        gauntletPairingEV: 0
      },
      "medicine/security": {
        name: "",
        gauntletPairingEV: 0
      },
      "science/security": {
        name: "",
        gauntletPairingEV: 0
      }
    },
    voyages: {
      "command/diplomacy": {
        name: "",
        voyagePairingEV: 0
      },
      "command/engineering": {
        name: "",
        voyagePairingEV: 0
      },
      "command/medicine": {
        name: "",
        voyagePairingEV: 0
      },
      "command/science": {
        name: "",
        voyagePairingEV: 0
      },
      "command/security": {
        name: "",
        voyagePairingEV: 0
      },
      "diplomacy/command": {
        name: "",
        voyagePairingEV: 0
      },
      "diplomacy/engineering": {
        name: "",
        voyagePairingEV: 0
      },
      "diplomacy/medicine": {
        name: "",
        voyagePairingEV: 0
      },
      "diplomacy/science": {
        name: "",
        voyagePairingEV: 0
      },
      "diplomacy/security": {
        name: "",
        voyagePairingEV: 0
      },
      "engineering/command": {
        name: "",
        voyagePairingEV: 0
      },
      "engineering/diplomacy": {
        name: "",
        voyagePairingEV: 0
      },
      "engineering/medicine": {
        name: "",
        voyagePairingEV: 0
      },
      "engineering/science": {
        name: "",
        voyagePairingEV: 0
      },
      "engineering/security": {
        name: "",
        voyagePairingEV: 0
      },
      "medicine/command": {
        name: "",
        voyagePairingEV: 0
      },
      "medicine/diplomacy": {
        name: "",
        voyagePairingEV: 0
      },
      "medicine/engineering": {
        name: "",
        voyagePairingEV: 0
      },
      "medicine/science": {
        name: "",
        voyagePairingEV: 0
      },
      "medicine/security": {
        name: "",
        voyagePairingEV: 0
      },
      "science/command": {
        name: "",
        voyagePairingEV: 0
      },
      "science/diplomacy": {
        name: "",
        voyagePairingEV: 0
      },
      "science/engineering": {
        name: "",
        voyagePairingEV: 0
      },
      "science/medicine": {
        name: "",
        voyagePairingEV: 0
      },
      "science/security": {
        name: "",
        voyagePairingEV: 0
      },
      "security/command": {
        name: "",
        voyagePairingEV: 0
      },
      "security/diplomacy": {
        name: "",
        voyagePairingEV: 0
      },
      "security/engineering": {
        name: "",
        voyagePairingEV: 0
      },
      "security/medicine": {
        name: "",
        voyagePairingEV: 0
      },
      "security/science": {
        name: "",
        voyagePairingEV: 0
      }
    }
  },
  findBestRankings(dataCoreCrew) {
    dataCoreCrew.forEach((crew, i) => {
      //Finding best crew possible
      //Gauntlet
      let skills = ["command_skill", "diplomacy_skill", "engineering_skill", "security_skill", "medicine_skill", "science_skill"];
      skills.forEach(primarySkill => {
        skills.forEach(secondarySkill => {
          if (primarySkill !== secondarySkill) {
            let primarySkillSliced = primarySkill.slice(0, primarySkill.indexOf('_'));
            let secondarySkillSliced = secondarySkill.slice(0, secondarySkill.indexOf('_'));
            let skillPairingKeyArray = [primarySkillSliced, secondarySkillSliced];
            let voyagePairingKey = `${skillPairingKeyArray[0]}/${skillPairingKeyArray[1]}`;
            skillPairingKeyArray.sort();
            let gauntletPairingKey = `${skillPairingKeyArray[0]}/${skillPairingKeyArray[1]}`;
            console.log(`Processing Combinations ${voyagePairingKey} for voyages and ${gauntletPairingKey} for gauntlet`);
            console.log(`We are working with the base_skill keys: ${primarySkill}, ${secondarySkill}`);
            let voyagePairingEV = 0;
            let gauntletPairingEV = 0
            for (var skill in crew.base_skills) {
              if (skill == primarySkill) {
                voyagePairingEV += (crew.base_skills[skill].core + (crew.base_skills[skill].range_min + crew.base_skills[skill].range_max)/2) * 0.35 ;
                gauntletPairingEV += (crew.base_skills[skill].range_min + crew.base_skills[skill].range_max)/2
              } else if (skill == secondarySkill) {
                voyagePairingEV += (crew.base_skills[skill].core + (crew.base_skills[skill].range_min + crew.base_skills[skill].range_max)/2) * 0.25;
                gauntletPairingEV += (crew.base_skills[skill].range_min + crew.base_skills[skill].range_max)/2
              } else {
                voyagePairingEV += (crew.base_skills[skill].core + (crew.base_skills[skill].range_min + crew.base_skills[skill].range_max)/2) * 0.1;
              }
            }

            if (voyagePairingEV > Optimizer.bestPossibleCrew.voyages[voyagePairingKey].voyagePairingEV) {
              console.log(`${crew.name} is better than ${Optimizer.bestPossibleCrew.voyages[voyagePairingKey].name} at ${voyagePairingKey} voyages with ${voyagePairingEV} over ${Optimizer.bestPossibleCrew.voyages[voyagePairingKey].voyagePairingEV}`);
              Optimizer.bestPossibleCrew.voyages[voyagePairingKey].name = crew.name;
              Optimizer.bestPossibleCrew.voyages[voyagePairingKey].voyagePairingEV = voyagePairingEV;
            } else {
              console.log(`${crew.name} is not as good as ${Optimizer.bestPossibleCrew.voyages[voyagePairingKey].name} at ${voyagePairingKey} voyages with ${voyagePairingEV} instead of ${Optimizer.bestPossibleCrew.voyages[voyagePairingKey].voyagePairingEV}`);
            }
            if (gauntletPairingEV > Optimizer.bestPossibleCrew.gauntlet[gauntletPairingKey].gauntletPairingEV) {
              console.log(`${crew.name} is better than ${Optimizer.bestPossibleCrew.gauntlet[gauntletPairingKey].name} at ${gauntletPairingKey} gauntlets with ${gauntletPairingEV} over ${Optimizer.bestPossibleCrew.gauntlet[gauntletPairingKey].gauntletPairingEV}`);
              Optimizer.bestPossibleCrew.gauntlet[gauntletPairingKey].name = crew.name;
              Optimizer.bestPossibleCrew.gauntlet[gauntletPairingKey].gauntletPairingEV = gauntletPairingEV;
            } else {
              console.log(`${crew.name} is not as good as ${Optimizer.bestPossibleCrew.gauntlet[gauntletPairingKey].name} at ${gauntletPairingKey} gauntlets with ${gauntletPairingEV} instead of ${Optimizer.bestPossibleCrew.gauntlet[gauntletPairingKey].gauntletPairingEV}`);
            }
          }
        });
      });
    });

  },
  assessCrewRoster(saveData, dataCoreCrew) {
    //Gathers all ids to check against for the full roster extraction
    //saveData = JSON.parse(saveData);
    let activeCrewIDArray = [];
    let activeCrewProgressLibrary = {};
    let frozenCrewIDArray = [];
    //Adding active crew's IDs to activeCrewIDArray
    saveData.player.character.crew.forEach(crew => {
      if (!activeCrewIDArray.includes(crew.archetype_id)) {
        activeCrewIDArray.push(crew.archetype_id);
        activeCrewProgressLibrary[crew.archetype_id] = {
          rarity: crew.rarity,
          level: crew.level,
          equipment: crew.equipment
        }
      } else {
      }
    });

    //Adding froze crew's IDs to frozenCrewIDArray
    saveData.player.character.stored_immortals.forEach(crew => {
      if (!frozenCrewIDArray.includes(crew.id)) {
        frozenCrewIDArray.push(crew.id);
      }
    });

    //Populates relevant data for acquired crew
    //Data processed differently if immortalized or not
    dataCoreCrew.forEach(crew => {

      //Processing frozen crew
      if (frozenCrewIDArray.includes(crew.archetype_id)) {
        let skillData = {};
        crew.skill_data.forEach(rarity => {
          skillData[rarity.rarity] = rarity;
        });
        skillData[crew.max_rarity] = {};
        skillData[crew.max_rarity].base_skills = crew.base_skills;
        let crewStats = {
          id: crew.archetype_id,
          name: crew.name,
          shortName: crew.short_name,
          rarity: crew.max_rarity,
          maxRarity: crew.max_rarity,
          immortalityStatus: {
            fullyEquipped: true,
            fullyLeveled: true,
            fullyFused: true,
            immortalized: true
          },
          chronsInvested: true,
          frozen: true,
          skillData: skillData,
          collections: crew.collections,
        }
        Optimizer.rosterLibrary[crew.name] = crewStats;
        Optimizer.rosterArray.push(crewStats);
      } else if (activeCrewIDArray.includes(crew.archetype_id)) {
        let crewProgress = activeCrewProgressLibrary[crew.archetype_id];

        let skillData = {};
        crew.skill_data.forEach(rarity => {
          skillData[rarity.rarity] = rarity;
        });
        skillData[crew.max_rarity] = {};
        skillData[crew.max_rarity].base_skills = crew.base_skills;

        let fullyLeveled = false;
        let fullyEquipped = false;
        let fullyFused = false;
        let chronsInvested = false;
        let immortalized = false;

        if (crewProgress.level == 100) {
          fullyLeveled = true;
        }

        if ((crewProgress.level >= 99) && crewProgress.equipment.length == 4) {
          fullyEquipped = true;
        }

        if (crewProgress.rarity == crew.max_rarity) {
          fullyFused = true;
        }

        if (fullyLeveled && fullyEquipped) {
          chronsInvested = true;
        }

        if (fullyEquipped && fullyLeveled && fullyFused) {
          immortalized = true;
        }

        let crewStats = {
          id: crew.archetype_id,
          name: crew.name,
          shortName: crew.short_name,
          rarity: crewProgress.rarity,
          maxRarity: crew.max_rarity,
          immortalityStatus: {
            fullyEquipped: fullyEquipped,
            fullyLeveled: fullyLeveled,
            fullyFused: fullyFused,
            immortalized: immortalized
          },
          chronsInvested: chronsInvested,
          frozen: false,
          skillData: skillData,
          collections: crew.collections,
        }
        Optimizer.rosterLibrary[crew.name] = crewStats;
        Optimizer.rosterArray.push(crewStats);
      }
    });

    Optimizer.rosterArray.forEach(crew => {
      crew.skillSet = {
        skillArray: [],
        signature: ''
      };
      for (var skill in crew.skillData[1].base_skills) {
        if (!crew.skillSet.skillArray.includes(skill) && skill != "rarity") {
          crew.skillSet.skillArray.push(skill);
        }
      }
      crew.skillSet.skillArray.sort();

      for (let skillIndex = 0; skillIndex < crew.skillSet.skillArray.length; skillIndex++) {
        crew.skillSet.signature += crew.skillSet.skillArray[skillIndex].slice(0, crew.skillSet.skillArray[skillIndex].indexOf('_'));
          if (skillIndex != crew.skillSet.skillArray.length - 1) {
            crew.skillSet.signature += "/";
          }
      }
      let voyageSkills = ["command_skill", "diplomacy_skill", "engineering_skill", "security_skill", "medicine_skill", "science_skill"];
      for (var rarity in crew.skillData) {
        let rarityLevel = crew.skillData[rarity];
        for (var skill in rarityLevel.base_skills) {
          let assessedSkill = rarityLevel.base_skills[skill];
          crew.skillData[rarity].base_skills[skill].ev = assessedSkill.core + (assessedSkill.range_min + assessedSkill.range_max)/2;
        }
        rarityLevel.voyageMetrics = {};
        voyageSkills.forEach(primarySkill => {
          voyageSkills.forEach(secondarySkill => {
            if (primarySkill !== secondarySkill) {
              let skillPairing = `${primarySkill.slice(0, primarySkill.indexOf('_'))}/${secondarySkill.slice(0, secondarySkill.indexOf('_'))}`;
              let voyageComboRating = 0;
              for (var skill in rarityLevel.base_skills) {
                let assessedSkill = rarityLevel.base_skills[skill];
                if (skill === primarySkill) {
                  voyageComboRating += assessedSkill.ev * 0.35;
                } else if (skill === secondarySkill) {
                  voyageComboRating += assessedSkill.ev * 0.25;
                } else {
                  voyageComboRating += assessedSkill.ev * 0.1;
                }
                crew.skillData[rarity].voyageMetrics[skillPairing] = voyageComboRating;
              }
            }
          });
        });
        let expectedVoyage = 0;
        for (var skillPairing in crew.skillData[rarity].voyageMetrics) {
          expectedVoyage += crew.skillData[rarity].voyageMetrics[skillPairing];
        }
        crew.skillData[rarity].voyageMetrics.expectedVoyage = expectedVoyage / 30;
      }


    });

    console.log("Crew Library:");
    console.log(Optimizer.rosterLibrary);
    console.log("Crew Array:");
    console.log(Optimizer.rosterArray);
  },
  populateSortingArray(sortingArray) {
    sortingArray = [];
    Optimizer.rosterArray.forEach(crew => {
      sortingArray.push(crew.name);
    });
    //console.log(sortingArray);
    console.log("Populated Roster");
    console.log(sortingArray);
  },
  sortVoyageRankings() {
    let sortingArray = [];

    Optimizer.skillPairingsArray.forEach(pairing => {
      //Voyage Ranking For Current Rarity Levels
      sortingArray = [];
      Optimizer.rosterArray.forEach(crew => {
        sortingArray.push(crew.name);
      });
      while (sortingArray.length > 0) {
        let nextRankedName = '';
        let nextRankedEV = 0;
        let nextRankedIndex = 0;
        sortingArray.forEach(crewName => {
          if (Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].rarity].voyageMetrics[pairing] > nextRankedEV) {
            nextRankedName = crewName;
            nextRankedEV = Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].rarity].voyageMetrics[pairing];
            nextRankedIndex = sortingArray.indexOf(crewName);
          }
        });
        Optimizer.voyageSkillRankings.currentRarity[pairing].push(nextRankedName);
        sortingArray.splice(nextRankedIndex, 1);
      }
      //Voyage Ranking for fully cited crew
      sortingArray = [];
      Optimizer.rosterArray.forEach(crew => {
        sortingArray.push(crew.name);
      });
      while (sortingArray.length > 0) {
        let nextRankedName = '';
        let nextRankedEV = 0;
        let nextRankedIndex = 0;
        sortingArray.forEach(crewName => {
          if (Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].maxRarity].voyageMetrics[pairing] > nextRankedEV) {
            nextRankedName = crewName;
            nextRankedEV = Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].maxRarity].voyageMetrics[pairing];
            nextRankedIndex = sortingArray.indexOf(crewName);
          }
        });
        Optimizer.voyageSkillRankings.fullyCited[pairing].push(nextRankedName);
        sortingArray.splice(nextRankedIndex, 1);
      }
    });
  },
  resetVoyageSkillPools() {
    for (var skillPool in Optimizer.voyageSkillPools) {
      Optimizer.voyageSkillPools[skillPool].assignedCrew = [];
      Optimizer.voyageSkillPools[skillPool].full = false;
    }
  },
  assignCrewToPools(pool, crewName) {
    //console.log(`Assigning ${crewName} to pool:`);
    //console.log(pool);
    if (!pool.assignedCrew.includes(crewName)) {
      pool.assignedCrew.push(crewName);
      if (pool.assignedCrew.length > pool.seats) {
        console.log(`Error! Pool has too many crew!`);
      } else if (pool.assignedCrew.length == pool.seats) {
        pool.full = true;
        Optimizer.fillSubSets(pool);
      }
      if (pool.superSets.length > 0) {
        pool.superSets.forEach(superSet => {
          Optimizer.assignCrewToPools(Optimizer.voyageSkillPools[superSet], crewName);
        });
      }
    }
  },
  fillSubSets(pool) {
    pool.subSets.forEach(subSet => {
      if (!Optimizer.voyageSkillPools[subSet].full) {
        Optimizer.voyageSkillPools[subSet].full = true;
        Optimizer.fillSubSets(Optimizer.voyageSkillPools[subSet]);
      }
    });
  },
  assessPoolVacancies(pool) {
    console.log(`Assessing vacancy of pool`);
    console.log(pool);
    if (pool.full) {
      pool.subSets.forEach(subSetSignature => {
        Optimizer.voyageSkillPools[subSetSignature].full = true;
      });
      if (pool.subSets.length > 0) {
        pool.subSets.forEach(subSetSignature => {
          Optimizer.assessPoolVacancies(Optimizer.voyageSkillPools[subSetSignature]);
        });
      }
    }
  },
  findCrewSeating() {
    let seatedCrew = [];
    let assignedSeats = {
      command_skill: [],
      diplomacy_skill: [],
      engineering_skill: [],
      medicine_skill: [],
      science_skill: [],
      security_skill: []
    };
    //Loop to identify the relevant skill counts of the crew for seating
    while (seatedCrew.length < 12) {
      let crewNotSeated = [];
      //Dud variable_minutes_to_popup to keep the script watcher happy
      let skillPools = {}
      let skillPairing = "Victory/Win";
      skillPools.voyageCrew.assignedCrew.forEach(crewName => {
        if (!seatedCrew.includes(crewName)) {
          crewNotSeated.push(crewName);
        }
      });
      let crewWith1RelevantSkill = [];
      let crewWith2RelevantSkills = [];
      let crewWith3RelevantSkills = [];
      let leastSkillsPerCrew = [];
      let crewWithRelevantSkillsLibrary = {};
      let relevantSkillCounts = {};
      crewNotSeated.forEach(crewName => {
        let relevantSkills = [];
        Optimizer.rosterLibrary[crewName].skillSet.skillArray.forEach(skill => {
          if (assignedSeats[skill].length < 2) {
            relevantSkills.push(skill);
          }
        });
        if (relevantSkills.length == 1) {
          crewWith1RelevantSkill.push(crewName);
        } else if (relevantSkills.length == 2) {
          crewWith2RelevantSkills.push(crewName);
        } else if (relevantSkills.length == 3) {
          crewWith3RelevantSkills.push(crewName);
        }
        crewWithRelevantSkillsLibrary[crewName] = relevantSkills;
      });
      //Populate the relevant skill counts
      crewWith1RelevantSkill.forEach(crewName => {
        crewWithRelevantSkillsLibrary[crewName].forEach(skill => {
          if (relevantSkillCounts[skill]) {
            relevantSkillCounts[skill].push(crewName);
          } else {
            relevantSkillCounts[skill] = [crewName];
          }
        });
      });
      crewWith2RelevantSkills.forEach(crewName => {
        crewWithRelevantSkillsLibrary[crewName].forEach(skill => {
          if (relevantSkillCounts[skill]) {
            relevantSkillCounts[skill].push(crewName);
          } else {
            relevantSkillCounts[skill] = [crewName];
          }
        });
      });
      crewWith3RelevantSkills.forEach(crewName => {
        crewWithRelevantSkillsLibrary[crewName].forEach(skill => {
          if (relevantSkillCounts[skill]) {
            relevantSkillCounts[skill].push(crewName);
          } else {
            relevantSkillCounts[skill] = [crewName];
          }
        });
      });
      if (crewWith1RelevantSkill.length > 0) {
        leastSkillsPerCrew = crewWith1RelevantSkill;
      } else if (crewWith2RelevantSkills.length > 0) {
        leastSkillsPerCrew = crewWith2RelevantSkills;
      } else if (crewWith3RelevantSkills.length > 0) {
        leastSkillsPerCrew = crewWith3RelevantSkills;
      } else {
        console.log("You broke something somewhere");
      }
      //copy-paste migration from static relevant idenity counts
      let leastKnownSkill = 'indecisive';
      let leastKnownSkillCount = 13;
      let nextCrewSeated = ''
      console.log(`Least skills per crew is`);
      console.log(leastSkillsPerCrew);
      console.log(`But relevant skills counts are`);
      for (var skill in relevantSkillCounts) {
        console.log(relevantSkillCounts[skill]);
      }
      for (var skill in relevantSkillCounts) {
        if (relevantSkillCounts[skill].length < leastKnownSkillCount && leastSkillsPerCrew.includes(relevantSkillCounts[skill][0])) {
            //&& relevantSkillCounts[skill].length > 0
            //&& Optimizer.topVoyageCrews.currentBest[skillPairing].seatAssignments[skill].length < 2
            //&& oneSkillCrew.includes(relevantSkillCounts[skill][0])) {
          leastKnownSkill = skill;
          leastKnownSkillCount = relevantSkillCounts[skill].length;
        }
      }
      console.log(`Least known skill is ${leastKnownSkill} when the skill counts are`);
      for (var skill in relevantSkillCounts) {
        console.log(relevantSkillCounts[skill]);
      }
      console.log(`Status at ${skillPairing} voyages`);
      console.log(Optimizer.topVoyageCrews.currentBest);
      nextCrewSeated = relevantSkillCounts[leastKnownSkill][0];
      console.log(`Seating ${nextCrewSeated} to ${Optimizer.topVoyageCrews.currentBest[skillPairing].seatAssignments[leastKnownSkill]}`);
      //Optimizer.topVoyageCrews.currentBest[skillPairing].seatAssignments[leastKnownSkill].push(nextCrewSeated);
      seatedCrew.push(nextCrewSeated);
      console.log(`Seated crew during ${skillPairing} is:`);
      console.log(seatedCrew);
      assignedSeats[leastKnownSkill].push(nextCrewSeated);
      console.log("And the assigned Seats are:");
      for (skill in assignedSeats) {
        console.log(assignedSeats[skill]);
      }
      console.log(`We are at the end of the ${skillPairing} seating with the seated Array:`);
      console.log(seatedCrew);
    };
  },
  //Focusing on the crew at their current rarity which need no more chroniton investment
  findCurrentBestCrew() {
    //The loop uses skillPairing to assess each voyage combination
    Optimizer.skillPairingsArray.forEach(skillPairing => {
      //One central object for the signatures and subsets is used. I should be cleared each time for repopulation during the next voyage combination
      ////May want to consider reducing the scope of that pool into the find best crew crew for X function
      Optimizer.resetVoyageSkillPools();
      //Abbreviating reference
      let skillPools = Optimizer.voyageSkillPools;
      //List of the highest EV crew for the voyage. We move down the list according to the index assessing if we want to consider the crew (trained or not)
      ///and if there is room left for them in their skill signature
      let rankArray = Optimizer.voyageSkillRankings.currentRarity[skillPairing];
      //Rank index is used to track where we are moving down the rank array
      let rankIndex = 0;
      /* these are obsolete and prepped for deletion
      let oneSkillCrew = [];
      let twoSkillCrew = [];
      let threeSkillCrew = [];
      let crewSkillCounts = {
        command_skill: [],
        diplomacy_skill: [],
        engineering_skill: [],
        medicine_skill: [],
        science_skill: [],
        security_skill: []
      };
      */
      //Used to find the best crew, but not seat them. These crew have been observed to have a valid seat waiting for them, even with the automated seating code failing
      while (!skillPools.voyageCrew.full) {
        let crewName = rankArray[rankIndex];
        let crew = Optimizer.rosterLibrary[crewName];
        //console.log(`${crewName}is rank ${rankIndex + 1} for ${skillPairing} voyages. Assessing.`);
        //console.log(crew);
        //If there is room in the immediate seats available and if they're already invested
        //console.log(`Assessing Skill Pools:`);
        //console.log(skillPools);
        //console.log(`Assessing signature ${crew.skillSet.signature}`);
        if (!skillPools[crew.skillSet.signature].full && crew.chronsInvested) {
          Optimizer.assignCrewToPools(skillPools[crew.skillSet.signature], crew.name);
          //Optimizer.assessPoolVacancies(Optimizer.voyageSkillPools.voyageCrew);
          rankIndex++;
          //console.log(`${crewName} was added to the ${skillPairing} voyage`);
        } else if (!crew.chronsInvested) {
          //console.log(`${crewName} is not trained!`);
          rankIndex++;
        } else if (skillPools[crew.skillSet.signature].full) {
          //console.log(`${crewName} is not good enough for ${skillPairing} voyages`);
          rankIndex++;
        }
      }



      //Saving the best crew of the combination for the loop into their permanent library
      skillPools.voyageCrew.assignedCrew.forEach(crewName => {
        //Crew roster unseated
        Optimizer.topVoyageCrews.currentBest[skillPairing].crew.push(crewName);
        for (var skill in Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].rarity].base_skills) {
          Optimizer.topVoyageCrews.currentBest[skillPairing].skillTotals[skill] +=
            Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].rarity].base_skills[skill].ev;
        };
        Optimizer.topVoyageCrews.currentBest[skillPairing].totalEV +=
        Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].rarity].voyageMetrics[skillPairing];
      });
      /*
      console.log(`Seated array at the end of the ${skillPairing} voyage is somehow:`);
      console.log(seatedCrew);
      console.log(`Assigned Seats at the end of ${skillPairing} is`);
      for (skill in assignedSeats) {
        console.log(assignedSeats.skill);
      }
      console.log(assignedSeats);
      for (skill in assignedSeats) {
        assignedSeats[skill].forEach(crewName => {
          Optimizer.topVoyageCrews.currentBest[skillPairing].seatAssignments[skill].push(crewName);
        });
      }
      */
      //console.log(`After completing ${skillPairing} is:`);
      //console.log(Optimizer.voyageSkillPools);
      //console.log(Optimizer.topVoyageCrews);
      //console.log(`Best Current Crew for ${skillPairing} found`);
    });
  },
  findBestForRarity() {
    //The loop uses skillPairing to assess each voyage combination
    Optimizer.skillPairingsArray.forEach(skillPairing => {
      //One central object for the signatures and subsets is used. I should be cleared each time for repopulation during the next voyage combination
      ////May want to consider reducing the scope of that pool into the find best crew crew for X function
      Optimizer.resetVoyageSkillPools();
      //Abbreviating reference
      let skillPools = Optimizer.voyageSkillPools;
      //List of the highest EV crew for the voyage. We move down the list according to the index assessing if we want to consider the crew (trained or not)
      ///and if there is room left for them in their skill signature
      let rankArray = Optimizer.voyageSkillRankings.currentRarity[skillPairing];
      //Rank index is used to track where we are moving down the rank array
      let rankIndex = 0;
      /* these are obsolete and prepped for deletion
      let oneSkillCrew = [];
      let twoSkillCrew = [];
      let threeSkillCrew = [];
      let crewSkillCounts = {
        command_skill: [],
        diplomacy_skill: [],
        engineering_skill: [],
        medicine_skill: [],
        science_skill: [],
        security_skill: []
      };
      */
      //Used to find the best crew, but not seat them. These crew have been observed to have a valid seat waiting for them, even with the automated seating code failing
      while (!skillPools.voyageCrew.full) {
        let crewName = rankArray[rankIndex];
        let crew = Optimizer.rosterLibrary[crewName];
        //console.log(`${crewName}is rank ${rankIndex + 1} for ${skillPairing} voyages. Assessing.`);
        //console.log(crew);
        //If there is room in the immediate seats available and if they're already invested
        //console.log(`Assessing Skill Pools:`);
        //console.log(skillPools);
        //console.log(`Assessing signature ${crew.skillSet.signature}`);
        if (!skillPools[crew.skillSet.signature].full) {
          Optimizer.assignCrewToPools(skillPools[crew.skillSet.signature], crew.name);
          //Optimizer.assessPoolVacancies(Optimizer.voyageSkillPools.voyageCrew);
          rankIndex++;
          //console.log(`${crewName} was added to the ${skillPairing} voyage`);
        } else if (skillPools[crew.skillSet.signature].full) {
          //console.log(`${crewName} is not good enough for ${skillPairing} voyages`);
          rankIndex++;
        }
      }



      //Saving the best crew of the combination for the loop into their permanent library
      skillPools.voyageCrew.assignedCrew.forEach(crewName => {
        //Crew roster unseated
        Optimizer.topVoyageCrews.rarityBest[skillPairing].crew.push(crewName);
        for (var skill in Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].rarity].base_skills) {
          Optimizer.topVoyageCrews.rarityBest[skillPairing].skillTotals[skill] +=
            Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].rarity].base_skills[skill].ev;
        };
        Optimizer.topVoyageCrews.rarityBest[skillPairing].totalEV +=
        Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].rarity].voyageMetrics[skillPairing];
      });
      /*
      let seatedCrew = [];
      let assignedSeats = {
        command_skill: [],
        diplomacy_skill: [],
        engineering_skill: [],
        medicine_skill: [],
        science_skill: [],
        security_skill: []
      };
      //Loop to identify the relevant skill counts of the crew for seating
      while (seatedCrew.length < 12) {
        let crewNotSeated = [];
        skillPools.voyageCrew.assignedCrew.forEach(crewName => {
          if (!seatedCrew.includes(crewName)) {
            crewNotSeated.push(crewName);
          }
        });
        let crewWith1RelevantSkill = [];
        let crewWith2RelevantSkills = [];
        let crewWith3RelevantSkills = [];
        let leastSkillsPerCrew = [];
        let crewWithRelevantSkillsLibrary = {};
        let relevantSkillCounts = {};
        crewNotSeated.forEach(crewName => {
          let relevantSkills = [];
          Optimizer.rosterLibrary[crewName].skillSet.skillArray.forEach(skill => {
            if (assignedSeats[skill].length < 2) {
              relevantSkills.push(skill);
            }
          });
          if (relevantSkills.length == 1) {
            crewWith1RelevantSkill.push(crewName);
          } else if (relevantSkills.length == 2) {
            crewWith2RelevantSkills.push(crewName);
          } else if (relevantSkills.length == 3) {
            crewWith3RelevantSkills.push(crewName);
          }
          crewWithRelevantSkillsLibrary[crewName] = relevantSkills;
        });
        //Populate the relevant skill counts
        crewWith1RelevantSkill.forEach(crewName => {
          crewWithRelevantSkillsLibrary[crewName].forEach(skill => {
            if (relevantSkillCounts[skill]) {
              relevantSkillCounts[skill].push(crewName);
            } else {
              relevantSkillCounts[skill] = [crewName];
            }
          });
        });
        crewWith2RelevantSkills.forEach(crewName => {
          crewWithRelevantSkillsLibrary[crewName].forEach(skill => {
            if (relevantSkillCounts[skill]) {
              relevantSkillCounts[skill].push(crewName);
            } else {
              relevantSkillCounts[skill] = [crewName];
            }
          });
        });
        crewWith3RelevantSkills.forEach(crewName => {
          crewWithRelevantSkillsLibrary[crewName].forEach(skill => {
            if (relevantSkillCounts[skill]) {
              relevantSkillCounts[skill].push(crewName);
            } else {
              relevantSkillCounts[skill] = [crewName];
            }
          });
        });
        if (crewWith1RelevantSkill.length > 0) {
          leastSkillsPerCrew = crewWith1RelevantSkill;
        } else if (crewWith2RelevantSkills.length > 0) {
          leastSkillsPerCrew = crewWith2RelevantSkills;
        } else if (crewWith3RelevantSkills.length > 0) {
          leastSkillsPerCrew = crewWith3RelevantSkills;
        } else {
          console.log("You broke something somewhere");
        }
        //copy-paste migration from static relevant idenity counts
        let leastKnownSkill = 'indecisive';
        let leastKnownSkillCount = 13;
        let nextCrewSeated = ''
        console.log(`Least skills per crew is`);
        console.log(leastSkillsPerCrew);
        console.log(`But relevant skills counts are`);
        for (var skill in relevantSkillCounts) {
          console.log(relevantSkillCounts[skill]);
        }
        for (var skill in relevantSkillCounts) {
          if (relevantSkillCounts[skill].length < leastKnownSkillCount && leastSkillsPerCrew.includes(relevantSkillCounts[skill][0])) {
              //&& relevantSkillCounts[skill].length > 0
              //&& Optimizer.topVoyageCrews.rarityBest[skillPairing].seatAssignments[skill].length < 2
              //&& oneSkillCrew.includes(relevantSkillCounts[skill][0])) {
            leastKnownSkill = skill;
            leastKnownSkillCount = relevantSkillCounts[skill].length;
          }
        }
        console.log(`Least known skill is ${leastKnownSkill} when the skill counts are`);
        for (var skill in relevantSkillCounts) {
          console.log(relevantSkillCounts[skill]);
        }
        console.log(`Status at ${skillPairing} voyages`);
        console.log(Optimizer.topVoyageCrews.rarityBest);
        nextCrewSeated = relevantSkillCounts[leastKnownSkill][0];
        console.log(`Seating ${nextCrewSeated} to ${Optimizer.topVoyageCrews.rarityBest[skillPairing].seatAssignments[leastKnownSkill]}`);
        //Optimizer.topVoyageCrews.rarityBest[skillPairing].seatAssignments[leastKnownSkill].push(nextCrewSeated);
        seatedCrew.push(nextCrewSeated);
        console.log(`Seated crew during ${skillPairing} is:`);
        console.log(seatedCrew);
        assignedSeats[leastKnownSkill].push(nextCrewSeated);
        console.log("And the assigned Seats are:");
        for (skill in assignedSeats) {
          console.log(assignedSeats[skill]);
        }
        console.log(`We are at the end of the ${skillPairing} seating with the seated Array:`);
        console.log(seatedCrew);
      };
      console.log(`Seated array at the end of the ${skillPairing} voyage is somehow:`);
      console.log(seatedCrew);
      console.log(`Assigned Seats at the end of ${skillPairing} is`);
      for (skill in assignedSeats) {
        console.log(assignedSeats.skill);
      }
      console.log(assignedSeats);
      for (skill in assignedSeats) {
        assignedSeats[skill].forEach(crewName => {
          Optimizer.topVoyageCrews.rarityBest[skillPairing].seatAssignments[skill].push(crewName);
        });
      }
      */
      //console.log(`After completing ${skillPairing} is:`);
      //console.log(Optimizer.voyageSkillPools);
      //console.log(Optimizer.topVoyageCrews);
      //console.log(`Best ${skillPairing} crew for current rarity found`);
    });
  },
  findCrewToTrain() {
    Optimizer.skillPairingsArray.forEach(skillPairing => {
      Optimizer.topVoyageCrews.rarityBest[skillPairing].crew.forEach(leveledCrew => {
        if (!Optimizer.topVoyageCrews.currentBest[skillPairing].crew.includes(leveledCrew)) {
          if (Optimizer.topCrewToTrain[leveledCrew]) {
            Optimizer.topCrewToTrain[leveledCrew].voyagesImproved.push(skillPairing);
          } else {
            Optimizer.topCrewToTrain[leveledCrew] = {
              voyagesImproved: [skillPairing],
              currentRarity: Optimizer.rosterLibrary[leveledCrew].rarity,
              maxRarity: Optimizer.rosterLibrary[leveledCrew].maxRarity,
              totalEVAdded: 0
            }
          }
        };
      });
    });
  },
  findEVContributionOfCrewToTrain() {
    //The loop uses skillPairing to assess each voyage combination
    for (var traineeName in Optimizer.topCrewToTrain) {
      Optimizer.topCrewToTrain[traineeName].voyagesImproved.forEach(skillPairing => {
        //One central object for the signatures and subsets is used. I should be cleared each time for repopulation during the next voyage combination
        ////May want to consider reducing the scope of that pool into the find best crew crew for X function
        Optimizer.resetVoyageSkillPools();
        //Abbreviating reference
        let skillPools = Optimizer.voyageSkillPools;
        //List of the highest EV crew for the voyage. We move down the list according to the index assessing if we want to consider the crew (trained or not)
        ///and if there is room left for them in their skill signature
        let rankArray = Optimizer.voyageSkillRankings.currentRarity[skillPairing];
        //Rank index is used to track where we are moving down the rank array
        let rankIndex = 0;
        /* these are obsolete and prepped for deletion
        let oneSkillCrew = [];
        let twoSkillCrew = [];
        let threeSkillCrew = [];
        let crewSkillCounts = {
          command_skill: [],
          diplomacy_skill: [],
          engineering_skill: [],
          medicine_skill: [],
          science_skill: [],
          security_skill: []
        };
        */
        //Used to find the best crew, but not seat them. These crew have been observed to have a valid seat waiting for them, even with the automated seating code failing
        while (!skillPools.voyageCrew.full) {
          //console.log(`While loop trying to process ${traineeName} in ${skillPairing} voyages`);
          let crewName = rankArray[rankIndex];
          let crew = Optimizer.rosterLibrary[crewName];
          //console.log(`${crewName}is rank ${rankIndex + 1} for ${skillPairing} voyages. Assessing.`);
          //console.log(crew);
          //If there is room in the immediate seats available and if they're already invested
          //console.log(`Assessing Skill Pools:`);
          //console.log(skillPools);
          //console.log(`Assessing signature ${crew.skillSet.signature}`);
          if (!skillPools[crew.skillSet.signature].full) {
            //console.log(`Entering the skillset Signature check! chronsInvested(${crew.chronsInvested}), crew.name(${crew.name}), traineeName(${traineeName})`);
            if (crew.chronsInvested || crew.name === traineeName) {
              //console.log("Entering the invested or trainee loop");
              Optimizer.assignCrewToPools(skillPools[crew.skillSet.signature], crew.name);
              //Optimizer.assessPoolVacancies(Optimizer.voyageSkillPools.voyageCrew);
              rankIndex++;
            } else {
              rankIndex++;
            }
            //console.log(`${crewName} was added to the ${skillPairing} voyage`);
          } else if (skillPools[crew.skillSet.signature].full) {
            //console.log(`${crewName} is not good enough for ${skillPairing} voyages`);
            rankIndex++;
          } else {
            console.log("We're still stuck in an infinite while loop?!");
          }
        }



        //Saving the best crew of the combination for the loop into their permanent library
        let voyageEVWithTrainee = 0;
        skillPools.voyageCrew.assignedCrew.forEach(crewName => {
          //Crew roster unseated
          voyageEVWithTrainee += Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].rarity].voyageMetrics[skillPairing];
        });
        Optimizer.topCrewToTrain[traineeName].totalEVAdded += voyageEVWithTrainee - Optimizer.topVoyageCrews.currentBest[skillPairing].totalEV;
        /*
        console.log(`Seated array at the end of the ${skillPairing} voyage is somehow:`);
        console.log(seatedCrew);
        console.log(`Assigned Seats at the end of ${skillPairing} is`);
        for (skill in assignedSeats) {
          console.log(assignedSeats.skill);
        }
        console.log(assignedSeats);
        for (skill in assignedSeats) {
          assignedSeats[skill].forEach(crewName => {
            Optimizer.topVoyageCrews.currentBest[skillPairing].seatAssignments[skill].push(crewName);
          });
        }
        */
        //console.log(`After completing ${skillPairing} is:`);
        //console.log(Optimizer.voyageSkillPools);
        //console.log(Optimizer.topVoyageCrews);
        //console.log(`Best Current Crew for ${skillPairing} found`);
      });
    }
  },
  sortCrewToTrain() {
    let sortingArray = [];
    for (let crewName in Optimizer.topCrewToTrain) {
      sortingArray.push(crewName);
    }
    while (sortingArray.length > 0) {
      let highestContribingTrainee = '';
      let highestContributedEV = 0;
      sortingArray.forEach(crewName => {
        if (Optimizer.topCrewToTrain[crewName].totalEVAdded > highestContributedEV) {
          highestContribingTrainee = crewName;
          highestContributedEV = Optimizer.topCrewToTrain[crewName].totalEVAdded
        }
      });
      Optimizer.rankedCrewToTrain.push({
        name: highestContribingTrainee,
        addedEV: highestContributedEV,
        currentRarity: Optimizer.rosterLibrary[highestContribingTrainee].rarity,
        maxRarity: Optimizer.rosterLibrary[highestContribingTrainee].maxRarity,
      });
      sortingArray.splice(sortingArray.indexOf(highestContribingTrainee), 1);
    }
  },
  findCrewNotCited() {

  },
  findBestCitedCrew() {
    //The loop uses skillPairing to assess each voyage combination
    Optimizer.skillPairingsArray.forEach(skillPairing => {
      //One central object for the signatures and subsets is used. I should be cleared each time for repopulation during the next voyage combination
      ////May want to consider reducing the scope of that pool into the find best crew crew for X function
      Optimizer.resetVoyageSkillPools();
      //Abbreviating reference
      let skillPools = Optimizer.voyageSkillPools;
      //List of the highest EV crew for the voyage. We move down the list according to the index assessing if we want to consider the crew (trained or not)
      ///and if there is room left for them in their skill signature
      let rankArray = Optimizer.voyageSkillRankings.fullyCited[skillPairing];
      //Rank index is used to track where we are moving down the rank array
      let rankIndex = 0;
      /* these are obsolete and prepped for deletion
      let oneSkillCrew = [];
      let twoSkillCrew = [];
      let threeSkillCrew = [];
      let crewSkillCounts = {
        command_skill: [],
        diplomacy_skill: [],
        engineering_skill: [],
        medicine_skill: [],
        science_skill: [],
        security_skill: []
      };
      */
      //Used to find the best crew, but not seat them. These crew have been observed to have a valid seat waiting for them, even with the automated seating code failing
      while (!skillPools.voyageCrew.full) {
        let crewName = rankArray[rankIndex];
        let crew = Optimizer.rosterLibrary[crewName];
        //console.log(`${crewName}is rank ${rankIndex + 1} for ${skillPairing} voyages. Assessing.`);
        //console.log(crew);
        //If there is room in the immediate seats available and if they're already invested
        //console.log(`Assessing Skill Pools:`);
        //console.log(skillPools);
        //console.log(`Assessing signature ${crew.skillSet.signature}`);
        if (!skillPools[crew.skillSet.signature].full) {
          Optimizer.assignCrewToPools(skillPools[crew.skillSet.signature], crew.name);
          //Optimizer.assessPoolVacancies(Optimizer.voyageSkillPools.voyageCrew);
          rankIndex++;
          //console.log(`${crewName} was added to the ${skillPairing} voyage`);
        } else if (skillPools[crew.skillSet.signature].full) {
          //console.log(`${crewName} is not good enough for ${skillPairing} voyages`);
          rankIndex++;
        }
      }



      //Saving the best crew of the combination for the loop into their permanent library
      skillPools.voyageCrew.assignedCrew.forEach(crewName => {
        //Crew roster unseated
        Optimizer.topVoyageCrews.citedBest[skillPairing].crew.push(crewName);
        for (var skill in Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].maxRarity].base_skills) {
          Optimizer.topVoyageCrews.citedBest[skillPairing].skillTotals[skill] +=
            Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].maxRarity].base_skills[skill].ev;
        };
        Optimizer.topVoyageCrews.citedBest[skillPairing].totalEV +=
        Optimizer.rosterLibrary[crewName].skillData[Optimizer.rosterLibrary[crewName].maxRarity].voyageMetrics[skillPairing];
      });
      /*
      let seatedCrew = [];
      let assignedSeats = {
        command_skill: [],
        diplomacy_skill: [],
        engineering_skill: [],
        medicine_skill: [],
        science_skill: [],
        security_skill: []
      };
      //Loop to identify the relevant skill counts of the crew for seating
      while (seatedCrew.length < 12) {
        let crewNotSeated = [];
        skillPools.voyageCrew.assignedCrew.forEach(crewName => {
          if (!seatedCrew.includes(crewName)) {
            crewNotSeated.push(crewName);
          }
        });
        let crewWith1RelevantSkill = [];
        let crewWith2RelevantSkills = [];
        let crewWith3RelevantSkills = [];
        let leastSkillsPerCrew = [];
        let crewWithRelevantSkillsLibrary = {};
        let relevantSkillCounts = {};
        crewNotSeated.forEach(crewName => {
          let relevantSkills = [];
          Optimizer.rosterLibrary[crewName].skillSet.skillArray.forEach(skill => {
            if (assignedSeats[skill].length < 2) {
              relevantSkills.push(skill);
            }
          });
          if (relevantSkills.length == 1) {
            crewWith1RelevantSkill.push(crewName);
          } else if (relevantSkills.length == 2) {
            crewWith2RelevantSkills.push(crewName);
          } else if (relevantSkills.length == 3) {
            crewWith3RelevantSkills.push(crewName);
          }
          crewWithRelevantSkillsLibrary[crewName] = relevantSkills;
        });
        //Populate the relevant skill counts
        crewWith1RelevantSkill.forEach(crewName => {
          crewWithRelevantSkillsLibrary[crewName].forEach(skill => {
            if (relevantSkillCounts[skill]) {
              relevantSkillCounts[skill].push(crewName);
            } else {
              relevantSkillCounts[skill] = [crewName];
            }
          });
        });
        crewWith2RelevantSkills.forEach(crewName => {
          crewWithRelevantSkillsLibrary[crewName].forEach(skill => {
            if (relevantSkillCounts[skill]) {
              relevantSkillCounts[skill].push(crewName);
            } else {
              relevantSkillCounts[skill] = [crewName];
            }
          });
        });
        crewWith3RelevantSkills.forEach(crewName => {
          crewWithRelevantSkillsLibrary[crewName].forEach(skill => {
            if (relevantSkillCounts[skill]) {
              relevantSkillCounts[skill].push(crewName);
            } else {
              relevantSkillCounts[skill] = [crewName];
            }
          });
        });
        if (crewWith1RelevantSkill.length > 0) {
          leastSkillsPerCrew = crewWith1RelevantSkill;
        } else if (crewWith2RelevantSkills.length > 0) {
          leastSkillsPerCrew = crewWith2RelevantSkills;
        } else if (crewWith3RelevantSkills.length > 0) {
          leastSkillsPerCrew = crewWith3RelevantSkills;
        } else {
          console.log("You broke something somewhere");
        }
        //copy-paste migration from static relevant idenity counts
        let leastKnownSkill = 'indecisive';
        let leastKnownSkillCount = 13;
        let nextCrewSeated = ''
        console.log(`Least skills per crew is`);
        console.log(leastSkillsPerCrew);
        console.log(`But relevant skills counts are`);
        for (var skill in relevantSkillCounts) {
          console.log(relevantSkillCounts[skill]);
        }
        for (var skill in relevantSkillCounts) {
          if (relevantSkillCounts[skill].length < leastKnownSkillCount && leastSkillsPerCrew.includes(relevantSkillCounts[skill][0])) {
              //&& relevantSkillCounts[skill].length > 0
              //&& Optimizer.topVoyageCrews.citedBest[skillPairing].seatAssignments[skill].length < 2
              //&& oneSkillCrew.includes(relevantSkillCounts[skill][0])) {
            leastKnownSkill = skill;
            leastKnownSkillCount = relevantSkillCounts[skill].length;
          }
        }
        console.log(`Least known skill is ${leastKnownSkill} when the skill counts are`);
        for (var skill in relevantSkillCounts) {
          console.log(relevantSkillCounts[skill]);
        }
        console.log(`Status at ${skillPairing} voyages`);
        console.log(Optimizer.topVoyageCrews.rarityBest);
        nextCrewSeated = relevantSkillCounts[leastKnownSkill][0];
        console.log(`Seating ${nextCrewSeated} to ${Optimizer.topVoyageCrews.rarityBest[skillPairing].seatAssignments[leastKnownSkill]}`);
        //Optimizer.topVoyageCrews.rarityBest[skillPairing].seatAssignments[leastKnownSkill].push(nextCrewSeated);
        seatedCrew.push(nextCrewSeated);
        console.log(`Seated crew during ${skillPairing} is:`);
        console.log(seatedCrew);
        assignedSeats[leastKnownSkill].push(nextCrewSeated);
        console.log("And the assigned Seats are:");
        for (skill in assignedSeats) {
          console.log(assignedSeats[skill]);
        }
        console.log(`We are at the end of the ${skillPairing} seating with the seated Array:`);
        console.log(seatedCrew);
      };
      console.log(`Seated array at the end of the ${skillPairing} voyage is somehow:`);
      console.log(seatedCrew);
      console.log(`Assigned Seats at the end of ${skillPairing} is`);
      for (skill in assignedSeats) {
        console.log(assignedSeats.skill);
      }
      console.log(assignedSeats);
      for (skill in assignedSeats) {
        assignedSeats[skill].forEach(crewName => {
          Optimizer.topVoyageCrews.rarityBest[skillPairing].seatAssignments[skill].push(crewName);
        });
      }
      */
      //console.log(`After completing ${skillPairing} is:`);
      //console.log(Optimizer.voyageSkillPools);
      //console.log(Optimizer.topVoyageCrews);
      //console.log(`Best ${skillPairing} crew for current rarity found`);
    });
  },
  findCrewToCite() {
    Optimizer.skillPairingsArray.forEach(skillPairing => {
      Optimizer.topVoyageCrews.citedBest[skillPairing].crew.forEach(citedCrew => {
        if (!Optimizer.rosterLibrary[citedCrew].immortalityStatus.fullyFused) {
          if (Optimizer.topCrewToCite[citedCrew]) {
            Optimizer.topCrewToCite[citedCrew].voyagesImproved.push(skillPairing);
          } else {
            Optimizer.topCrewToCite[citedCrew] = {
              voyagesImproved: [skillPairing],
              citationsUntilRelevancy: 0,
              totalEVPerCitation: 0,
              totalEVNextCitation: 0,
              totalEVFullyCited: 0
            }
          }
        };
      });
    });
  },
  createCandidateRarityRankingArray(candidateName, candidateRarityLevel, skillPairing) {
    let candidate = Optimizer.rosterLibrary[candidateName];
    let currentRarityRankingArray = Optimizer.voyageSkillRankings.currentRarity[skillPairing];
    let currentRarityWithCandidateRankingArray = [];
    let currentRarityIndex = 0;
    let candidatePlaced = false;
    while (currentRarityIndex < currentRarityRankingArray.length) {
      let crew = Optimizer.rosterLibrary[currentRarityRankingArray[currentRarityIndex]];
      if (candidateName == crew.name) {
        currentRarityWithCandidateRankingArray.push(candidateName);
        currentRarityIndex++;
      } else if (candidate.skillData[candidateRarityLevel].voyageMetrics[skillPairing] > crew.skillData[crew.rarity].voyageMetrics[skillPairing] && !candidatePlaced) {
        currentRarityWithCandidateRankingArray.push(candidateName);
        candidatePlaced = true;
      } else {
        currentRarityWithCandidateRankingArray.push(crew.name);
        currentRarityIndex++;
      }
    }
    return currentRarityWithCandidateRankingArray;
  },
  findBestCrewWithRarityDependentCandidate(rankArray, candidateName) {
    Optimizer.resetVoyageSkillPools();
    let skillPools = Optimizer.voyageSkillPools;
    let rankIndex = 0;
    while (!skillPools.voyageCrew.full) {
      //console.log(`While loop trying to process ${citationCandidate} in ${skillPairing} voyages`);
      let crewName = rankArray[rankIndex];
      let crew = Optimizer.rosterLibrary[crewName];
      //console.log(`${crewName}is rank ${rankIndex + 1} for ${skillPairing} voyages. Assessing.`);
      //console.log(crew);
      //If there is room in the immediate seats available and if they're already invested
      //console.log(`Assessing Skill Pools:`);
      //console.log(skillPools);
      //console.log(`Assessing signature ${crew.skillSet.signature}`);
      if (!skillPools[crew.skillSet.signature].full) {
        //console.log(`Entering the skillset Signature check! chronsInvested(${crew.chronsInvested}), crew.name(${crew.name}), citationCandidate(${citationCandidate})`);
        if (crew.chronsInvested || crew.name === candidateName) {
          //console.log("Entering the invested or trainee loop");
          Optimizer.assignCrewToPools(skillPools[crew.skillSet.signature], crew.name);
          //Optimizer.assessPoolVacancies(Optimizer.voyageSkillPools.voyageCrew);
          rankIndex++;
        } else {
          rankIndex++;
        }
        //console.log(`${crewName} was added to the ${skillPairing} voyage`);
      } else if (skillPools[crew.skillSet.signature].full) {
        //console.log(`${crewName} is not good enough for ${skillPairing} voyages`);
        rankIndex++;
      } else {
        console.log("We're still stuck in an infinite while loop?!");
      }
    }
    let voyageCrew = skillPools.voyageCrew.assignedCrew;
    return voyageCrew;
  },
  findEVofVoyageCrewWithRarityDependentCandidate(voyageCrew, skillPairing, candidateName, rarityLevel) {
    let candidate = Optimizer.rosterLibrary[candidateName];
    let totalVoyageEV = 0;
    voyageCrew.forEach(crewName => {
      let crew = Optimizer.rosterLibrary[crewName];
      if (crewName == candidateName) {
        totalVoyageEV += candidate.skillData[rarityLevel].voyageMetrics[skillPairing];
      } else {
        totalVoyageEV += crew.skillData[crew.rarity].voyageMetrics[skillPairing];
      }
    });
    return totalVoyageEV;
  },
  findEVContributionOfCrewToCite() {
    for (var citationCandidateName in Optimizer.topCrewToCite) {
      let candidate = Optimizer.rosterLibrary[citationCandidateName];
      Optimizer.topCrewToCite[candidate.name].voyagesImproved.forEach(skillPairing => {
        //We need to compare the candidate as if they were leveled at current rarity and compare against leveled candidate at max rarity
        //If we calculate a partially fused unleveled candidate against their potential at max rarity, we will get artificially high EV/citation numbers

        //Also around here I intend to eventually do a loop through each individual remaining rarity level to process how many citations until relevance, and the EV ot the NEXT citation

        //To get the EV of the crew with candidate at current rarity. It is possible that a candidate which is relevant at max rarity will not get picked at their current rarity
        //This will correctly reduce their EV/citation, reflecting a true increase of potential while fully cited while also properly suggesting that they might not be the best next choice
        let voyageRankingWithCandidateAtCurrentRarity = Optimizer.createCandidateRarityRankingArray(candidate.name, candidate.rarity, skillPairing);
        console.log(`${skillPairing} voyage ranking array with ${candidate.name} at current rarity:`);
        console.log(voyageRankingWithCandidateAtCurrentRarity);
        let voyageCrewWithCandidateAtCurrentRarity = Optimizer.findBestCrewWithRarityDependentCandidate(voyageRankingWithCandidateAtCurrentRarity, candidate.name);
        console.log(`${skillPairing} voyage crew with ${candidate.name} at current rarity`);
        console.log(voyageCrewWithCandidateAtCurrentRarity);
        let voyageEVWithCandidateAtCurrentRarity = Optimizer.findEVofVoyageCrewWithRarityDependentCandidate(voyageCrewWithCandidateAtCurrentRarity, skillPairing, candidate.name, candidate.rarity);
        console.log(`${skillPairing} voyage EV with ${candidate.name} at current rarity`);
        console.log(voyageEVWithCandidateAtCurrentRarity);

        //Get the EV of crew with candidate at max rarity
        let voyageRankingWithCandidateAtMaxRarity = Optimizer.createCandidateRarityRankingArray(candidate.name, candidate.maxRarity, skillPairing);
        console.log(`${skillPairing} voyage ranking array with ${candidate.name} at max rarity:`);
        console.log(voyageRankingWithCandidateAtMaxRarity);
        let voyageCrewWithCandidateAtMaxRarity = Optimizer.findBestCrewWithRarityDependentCandidate(voyageRankingWithCandidateAtMaxRarity, candidate.name);
        console.log(`${skillPairing} voyage crew with ${candidate.name} at max rarity`);
        console.log(voyageCrewWithCandidateAtMaxRarity);
        let voyageEVWithCandidateAtMaxRarity = Optimizer.findEVofVoyageCrewWithRarityDependentCandidate(voyageCrewWithCandidateAtMaxRarity, skillPairing, candidate.name, candidate.maxRarity);
        console.log(`${skillPairing} voyage EV with ${candidate.name} at max rarity`);
        console.log(voyageEVWithCandidateAtMaxRarity);

        Optimizer.topCrewToCite[candidate.name].totalEVPerCitation += (voyageEVWithCandidateAtMaxRarity - voyageEVWithCandidateAtCurrentRarity)/(candidate.maxRarity - candidate.rarity);
      });
    }
  },
  sortCrewToCite() {
    let sortingArray = [];
    for (let crewName in Optimizer.topCrewToCite) {
      sortingArray.push(crewName);
    }
    while (sortingArray.length > 0) {
      let highestContribingTrainee = '';
      let highestContributedEV = 0;
      sortingArray.forEach(crewName => {
        if (Optimizer.topCrewToCite[crewName].totalEVPerCitation > highestContributedEV) {
          highestContribingTrainee = crewName;
          highestContributedEV = Optimizer.topCrewToCite[crewName].totalEVPerCitation
        }
      });
      Optimizer.rankedCrewToCite.push({
        name: highestContribingTrainee,
        evPerCitation: highestContributedEV
      });
      sortingArray.splice(sortingArray.indexOf(highestContribingTrainee), 1);
    }
  },
};

export default Optimizer;
