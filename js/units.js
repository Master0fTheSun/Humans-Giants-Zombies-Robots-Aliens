// ============================================================
// UNIT DEFINITIONS - All 5 Factions
// ============================================================

const FACTIONS = {
    humans: {
        name: 'Humans',
        color: '#4a9eff',
        darkColor: '#2060a0',
        units: {}
    },
    giants: {
        name: 'Giants',
        color: '#c8a050',
        darkColor: '#806030',
        units: {}
    },
    zombies: {
        name: 'Zombies',
        color: '#5cb85c',
        darkColor: '#307030',
        units: {}
    },
    robots: {
        name: 'Robots',
        color: '#b0b0b0',
        darkColor: '#606060',
        units: {}
    },
    aliens: {
        name: 'Aliens',
        color: '#c060ff',
        darkColor: '#6030a0',
        units: {}
    }
};

// ============================================================
// HUMANS
// ============================================================

FACTIONS.humans.units = {
    marine: {
        name: 'Marine',
        deploymentWeight: 5,
        goldCost: 20,
        hp: 20,
        maxHp: 20,
        size: '1x1',
        movement: { range: 3, directions: 'orthogonal' },
        attacks: [
            {
                name: 'Rifle',
                range: 3,
                direction: 'omnidirectional',
                damageMin: 1,
                damageMax: 5,
                bursts: 2,
                type: 'projectile'
            }
        ],
        passive: {
            name: 'Last Stand',
            description: '20% chance of surviving lethal damage with 1 HP.'
        },
        description: 'Versatile ranged infantry. Has a chance to survive lethal damage.',
        symbol: 'Ma'
    },
    medic: {
        name: 'Medic',
        deploymentWeight: 5,
        goldCost: 25,
        hp: 15,
        maxHp: 15,
        size: '1x1',
        movement: { range: 3, directions: 'orthogonal' },
        attacks: [
            {
                name: 'Pistol',
                range: 4,
                direction: 'omnidirectional',
                damageMin: 1,
                damageMax: 3,
                bursts: 1,
                type: 'projectile'
            }
        ],
        abilities: [
            {
                name: 'Heal',
                type: 'heal',
                range: 1,
                healMin: 3,
                healMax: 7,
                description: 'Heal an adjacent friendly unit for 3-7 HP.'
            },
            {
                name: 'Smoke Grenade',
                type: 'smoke',
                range: 3,
                aoeSize: 2,
                duration: 3,
                description: 'Throw smoke. Enemies inside have range reduced to 1. Lasts 3 turns.'
            }
        ],
        description: 'Support unit. Heals allies and throws smoke grenades.',
        symbol: 'Md'
    },
    commander: {
        name: 'Commander',
        deploymentWeight: 10,
        goldCost: 50,
        hp: 25,
        maxHp: 25,
        size: '1x1',
        movement: { range: 2, directions: 'forward_only' },
        attacks: [
            {
                name: 'Shotgun',
                range: 3,
                direction: 'omnidirectional',
                damageMin: 2,
                damageMax: 8,
                bursts: 1,
                type: 'projectile',
                distanceScaling: true
            },
            {
                name: 'Combat Knife',
                range: 1,
                direction: 'omnidirectional',
                damageMin: 3,
                damageMax: 5,
                bursts: 1,
                type: 'melee'
            }
        ],
        description: 'Tough leader. Shotgun hits harder up close. Moves forward only.',
        symbol: 'Cm'
    },
    mercenary: {
        name: 'Mercenary',
        deploymentWeight: 5,
        goldCost: 35,
        hp: 20,
        maxHp: 20,
        size: '1x1',
        movement: { range: 5, directions: 'l_pattern' },
        attacks: [
            {
                name: 'Silenced Rifle',
                range: 4,
                direction: 'omnidirectional',
                damageMin: 3,
                damageMax: 10,
                bursts: 1,
                type: 'projectile'
            },
            {
                name: 'Silenced Pistol',
                range: 4,
                direction: 'omnidirectional',
                damageMin: 2,
                damageMax: 8,
                bursts: 1,
                type: 'projectile'
            }
        ],
        passive: {
            name: 'Backstab',
            description: 'If the enemy is facing away, damage rolls are heavily weighted toward max.'
        },
        description: 'Stealthy flanker. Moves in an L-pattern. Deadly from behind.',
        symbol: 'Mc'
    },
    engineer: {
        name: 'Engineer',
        deploymentWeight: 5,
        goldCost: 30,
        hp: 15,
        maxHp: 15,
        size: '1x1',
        movement: { range: 3, directions: 'orthogonal' },
        attacks: [],
        abilities: [
            {
                name: 'Deploy Mine',
                type: 'mine',
                range: 1,
                damageMin: 5,
                damageMax: 5,
                aoeRange: 5,
                description: 'Place a hidden mine. Explodes when stepped on. Friendly fire enabled.'
            },
            {
                name: 'Deploy Auto Turret',
                type: 'turret',
                range: 1,
                direction: 'forward',
                detectionRange: 4,
                damageMin: 3,
                damageMax: 6,
                description: 'Place a turret 1 square forward. Active next turn. Fires at enemies in range.'
            },
            {
                name: 'Repair',
                type: 'repair',
                range: 1,
                healMin: 5,
                healMax: 10,
                target: 'tank',
                description: 'Repair an adjacent or occupied Tank for 5-10 HP.'
            }
        ],
        description: 'Utility unit. Deploys mines and turrets. Repairs tanks.',
        symbol: 'En'
    },
    tank: {
        name: 'Tank',
        deploymentWeight: 20,
        goldCost: 100,
        hp: 75,
        maxHp: 75,
        size: '1x1',
        movement: { range: 4, directions: 'forward_back', backRange: 2 },
        requiresCrew: true,
        crewMin: 2,
        crewMax: 4,
        requiresCommander: true,
        attacks: [
            {
                name: 'Cannon',
                range: 5,
                direction: 'forward_left_right',
                damageMin: 10,
                damageMax: 15,
                bursts: 1,
                reloadTime: 3,
                type: 'projectile'
            },
            {
                name: 'Machine Gun',
                range: 4,
                direction: 'forward_left_right',
                damageMin: 4,
                damageMax: 10,
                bursts: 1,
                requiresGunner: true,
                type: 'projectile'
            }
        ],
        passive: {
            name: 'Disabled',
            description: 'At 10% HP, the tank can no longer move.'
        },
        description: 'Heavy vehicle. Needs a Commander + 1 crew. Devastating firepower.',
        symbol: 'Tk'
    },
    marksman: {
        name: 'Marksman',
        deploymentWeight: 5,
        goldCost: 45,
        hp: 10,
        maxHp: 10,
        size: '1x1',
        movement: { range: 3, directions: 'orthogonal' },
        attacks: [
            {
                name: 'Heavy Bolt-Action',
                range: 7,
                direction: 'lines_and_diagonals',
                damageMin: 10,
                damageMax: 15,
                bursts: 1,
                type: 'projectile'
            }
        ],
        passive: {
            name: 'Set Up',
            description: 'Cannot move and fire in the same turn.'
        },
        description: 'Glass cannon. Longest range in the game but very fragile.',
        symbol: 'Mk'
    },
    comms_officer: {
        name: 'Comms Officer',
        deploymentWeight: 5,
        goldCost: 35,
        hp: 15,
        maxHp: 15,
        size: '1x1',
        movement: { range: 3, directions: 'orthogonal' },
        attacks: [
            {
                name: 'SMG',
                range: 3,
                direction: 'omnidirectional',
                damageMin: 2,
                damageMax: 4,
                bursts: 1,
                type: 'projectile'
            }
        ],
        aura: {
            name: 'Tactical Link',
            range: 2,
            movementBonus: 1,
            rangeBonus: 1,
            description: 'Friendly units within 2 squares gain +1 Movement and +1 Range.'
        },
        description: 'Buffer unit. Boosts nearby allies\' movement and range.',
        symbol: 'CO'
    },
    riot_guard: {
        name: 'Riot Guard',
        deploymentWeight: 10,
        goldCost: 40,
        hp: 40,
        maxHp: 40,
        size: '1x1',
        movement: { range: 2, directions: 'orthogonal' },
        attacks: [
            {
                name: 'Stun Baton',
                range: 1,
                direction: 'omnidirectional',
                damageMin: 3,
                damageMax: 3,
                bursts: 1,
                type: 'melee',
                knockback: 1
            }
        ],
        passive: {
            name: 'Shield Wall',
            description: 'Units directly behind this unit cannot be targeted by direct-fire weapons.'
        },
        description: 'Mobile cover. Shields allies behind it. Stun baton with knockback.',
        symbol: 'RG'
    },
    transport_drone: {
        name: 'Transport Drone',
        deploymentWeight: 5,
        goldCost: 15,
        hp: 5,
        maxHp: 5,
        size: '1x1',
        movement: { range: 6, directions: 'flying' },
        canTransport: true,
        transportMax: 1,
        transportMaxWeight: 10,
        attacks: [],
        abilities: [
            {
                name: 'Flashbang',
                type: 'flashbang',
                range: 3,
                aoeSize: 3,
                description: 'Removes Reaction Fire from enemies. Reveals hidden explosives in 3x3 area.'
            }
        ],
        description: 'Cheap flying scout. Reveals mines and transports a small unit.',
        symbol: 'TD'
    }
};

// ============================================================
// GIANTS
// ============================================================

FACTIONS.giants.units = {
    granite_aegis: {
        name: 'Granite Aegis',
        deploymentWeight: 25,
        goldCost: 125,
        hp: 150,
        maxHp: 150,
        size: '2x2',
        movement: { range: 2, directions: 'omnidirectional' },
        attacks: [
            {
                name: 'Quake Stomp',
                range: 2,
                direction: 'radius',
                damageMin: 5,
                damageMax: 10,
                bursts: 1,
                type: 'aoe',
                pushback: 2,
                pushTargetSize: '1x1'
            },
            {
                name: 'Granite Slam',
                range: 1,
                direction: 'adjacent',
                damageMin: 12,
                damageMax: 18,
                bursts: 1,
                type: 'melee'
            }
        ],
        passive: {
            name: 'Kinetic Reflection',
            description: 'Reduces projectile damage by 3. Attacker takes 50% of raw damage as shrapnel.',
            damageReduction: 3,
            reflectPercent: 0.5
        },
        description: 'The ultimate tank. Reflects projectile damage back at attackers.',
        symbol: 'GA'
    },
    storm_hurler: {
        name: 'Storm Hurler',
        deploymentWeight: 15,
        goldCost: 85,
        hp: 90,
        maxHp: 90,
        size: '2x2',
        movement: { range: 2, directions: 'forward_left_right' },
        attacks: [
            {
                name: 'Boulder Toss',
                range: 8,
                minRange: 4,
                direction: 'omnidirectional',
                damageMin: 15,
                damageMax: 20,
                bursts: 1,
                type: 'projectile',
                createsRubble: true,
                rubbleDuration: 2
            },
            {
                name: 'Thunderclap',
                range: 3,
                direction: 'forward_cone',
                damageMin: 5,
                damageMax: 8,
                bursts: 1,
                type: 'aoe',
                debuff: 'deafened',
                debuffDuration: 1
            }
        ],
        description: 'Giant artillery. Hurls boulders at long range. Creates rubble obstacles.',
        symbol: 'SH'
    },
    butcher: {
        name: 'Butcher Giant',
        deploymentWeight: 10,
        goldCost: 60,
        hp: 80,
        maxHp: 80,
        size: '2x2',
        movement: { range: 3, directions: 'omnidirectional' },
        attacks: [
            {
                name: 'Cleave',
                range: 2,
                direction: 'horizontal_arc',
                damageMin: 10,
                damageMax: 14,
                bursts: 1,
                type: 'melee'
            },
            {
                name: 'Meat Hook',
                range: 4,
                direction: 'straight_line',
                damageMin: 5,
                damageMax: 5,
                bursts: 1,
                type: 'special',
                pullsTarget: true
            }
        ],
        passive: {
            name: 'Blood Frenzy',
            description: 'If the Butcher kills a unit, it gains an extra action this turn.'
        },
        description: 'Frontline brawler. Hooks enemies in and cleaves. Extra action on kill.',
        symbol: 'BG'
    },
    forest_walker: {
        name: 'Forest-Walker',
        deploymentWeight: 10,
        goldCost: 55,
        hp: 100,
        maxHp: 100,
        size: '2x2',
        movement: { range: 2, directions: 'omnidirectional' },
        attacks: [
            {
                name: 'Root Entangle',
                range: 5,
                direction: 'targeted',
                damageMin: 2,
                damageMax: 4,
                bursts: 1,
                type: 'special',
                rootDuration: 1
            },
            {
                name: 'Canopy Sweep',
                range: 3,
                direction: 'forward_3x3',
                damageMin: 6,
                damageMax: 10,
                bursts: 1,
                type: 'aoe'
            }
        ],
        passive: {
            name: 'Living Cover',
            description: 'Friendly 1x1 units adjacent to this unit cannot be targeted by long-range attacks.'
        },
        description: 'AOE support giant. Roots enemies and shields adjacent allies.',
        symbol: 'FW'
    }
};

// Giant global passive
FACTIONS.giants.mechanic = {
    name: 'Overrun',
    description: 'Giants can move through 1x1 units. Enemies trampled take 3-5 damage.'
};

// ============================================================
// ZOMBIES
// ============================================================

FACTIONS.zombies.units = {
    shambler: {
        name: 'Shambler',
        deploymentWeight: 2,
        goldCost: 5,
        hp: 10,
        maxHp: 10,
        size: '1x1',
        movement: { range: 2, directions: 'omnidirectional' },
        attacks: [
            {
                name: 'Ragged Bite',
                range: 1,
                direction: 'adjacent',
                damageMin: 2,
                damageMax: 2,
                bursts: 1,
                type: 'melee',
                infectionPoints: 1
            }
        ],
        passive: {
            name: 'Strength in Numbers',
            description: 'If adjacent to 2+ Shamblers, damage increases to 5.'
        },
        canStack: true,
        maxStack: 3,
        description: 'Cheap fodder. Stronger in groups. Can stack 3 to a square.',
        symbol: 'Sh'
    },
    bile_spitter: {
        name: 'Bile-Spitter',
        deploymentWeight: 4,
        goldCost: 20,
        hp: 15,
        maxHp: 15,
        size: '1x1',
        movement: { range: 3, directions: 'omnidirectional' },
        attacks: [
            {
                name: 'Acidic Vomit',
                range: 4,
                direction: 'omnidirectional',
                damageMin: 5,
                damageMax: 5,
                bursts: 1,
                type: 'projectile',
                debuff: 'melting_armor',
                debuffDuration: 2,
                bonusDamageTaken: 2
            }
        ],
        description: 'Ranged zombie. Acid debuffs enemies to take +2 damage from all sources.',
        symbol: 'BS'
    },
    carrion_burrower: {
        name: 'Carrion-Burrower',
        deploymentWeight: 5,
        goldCost: 30,
        hp: 20,
        maxHp: 20,
        size: '1x1',
        movement: { range: 4, directions: 'subterranean' },
        attacks: [
            {
                name: 'Ankle Grab',
                range: 1,
                direction: 'adjacent',
                damageMin: 3,
                damageMax: 3,
                bursts: 1,
                type: 'melee',
                rootDuration: 1
            }
        ],
        abilities: [
            {
                name: 'Surprise!',
                type: 'erupt',
                damageMin: 8,
                damageMax: 8,
                description: 'Erupt under a Human unit. Deal 8 damage and swap positions.'
            }
        ],
        description: 'Underground ambusher. Moves through occupied squares. Anchors targets.',
        symbol: 'CB'
    },
    screamer: {
        name: 'Screamer',
        deploymentWeight: 6,
        goldCost: 40,
        hp: 25,
        maxHp: 25,
        size: '1x1',
        movement: { range: 3, directions: 'omnidirectional' },
        attacks: [
            {
                name: 'Sonic Shriek',
                range: 3,
                direction: 'radius',
                damageMin: 2,
                damageMax: 2,
                bursts: 1,
                type: 'aoe'
            }
        ],
        abilities: [
            {
                name: 'Rally the Dead',
                type: 'rally',
                range: 3,
                description: 'All zombies in range move 1 square toward target. Does not cost movement.'
            }
        ],
        description: 'Zombie commander. AOE shriek and rallies nearby zombies.',
        symbol: 'Sc'
    }
};

FACTIONS.zombies.mechanic = {
    name: 'Infection',
    description: 'Zombie bites add Infection Points. Humans/Aliens: 2 IP = Converted. Giants: 10 IP = Converted. Converted units become Shamblers. Robots are immune.',
    movesPerTurn: 3,
    fleshPile: 'Up to 3 Shamblers can occupy 1 square and attack together.'
};

// ============================================================
// ROBOTS
// ============================================================

FACTIONS.robots.units = {
    mirage_node: {
        name: 'Mirage-Node',
        deploymentWeight: 5,
        goldCost: 30,
        hp: 15,
        maxHp: 15,
        size: '1x1',
        movement: { range: 3, directions: 'omnidirectional' },
        attacks: [],
        abilities: [
            {
                name: 'Holographic Projection',
                type: 'hologram',
                description: 'Create a Phantom duplicate of any friendly unit. Phantom looks real, can move, but deals 0 damage. Vanishes when attacked.'
            }
        ],
        description: 'Illusionist. Creates phantom duplicates that waste enemy attacks.',
        symbol: 'MN'
    },
    logic_spirit: {
        name: 'Logic-Spirit',
        deploymentWeight: 8,
        goldCost: 45,
        hp: 20,
        maxHp: 20,
        size: '1x1',
        movement: { range: 2, directions: 'omnidirectional' },
        attacks: [],
        abilities: [
            {
                name: 'System Override',
                type: 'hack',
                range: 4,
                description: 'Target a Human or Alien unit. Next turn, Robot player controls where it moves and attacks.',
                validTargets: ['humans', 'aliens']
            }
        ],
        passive: {
            name: 'Incompatible Hardware',
            description: 'Cannot target Giants or Zombies. Cannot target Aliens in Dark Matter Fog.'
        },
        description: 'Hacker. Takes control of enemy Human or Alien units for a turn.',
        symbol: 'LS'
    },
    calculus_engine: {
        name: 'Calculus-Engine',
        deploymentWeight: 15,
        goldCost: 85,
        hp: 60,
        maxHp: 60,
        size: '1x1',
        movement: { range: 2, directions: 'omnidirectional' },
        attacks: [
            {
                name: 'Fixed-Point Laser',
                range: 5,
                direction: 'omnidirectional',
                damageMin: 8,
                damageMax: 8,
                bursts: 1,
                type: 'projectile'
            }
        ],
        passive: {
            name: 'Zero-Sum Protocol',
            description: 'When attacked and survives, deals the same amount of HP lost back to the attacker at any range.'
        },
        description: 'Dominator. Fixed 8 damage laser. Reflects exact damage taken back.',
        symbol: 'CE'
    },
    fabricator_node: {
        name: 'Fabricator Node',
        deploymentWeight: 10,
        goldCost: 50,
        hp: 30,
        maxHp: 30,
        size: '1x1',
        movement: { range: 2, directions: 'omnidirectional' },
        attacks: [],
        abilities: [
            {
                name: 'Armor Patch',
                type: 'repair',
                range: 1,
                healAmount: 10,
                description: 'Restore exactly 10 HP to an adjacent Robot unit.'
            },
            {
                name: 'Print Crawler',
                type: 'spawn',
                description: 'Spawn a Crawler drone (1 DW, 5 HP) on an adjacent square. Crawlers explode for 5 damage on contact.'
            }
        ],
        description: 'Support factory. Repairs robots and spawns explosive Crawlers.',
        symbol: 'FN'
    },
    crawler: {
        name: 'Crawler',
        deploymentWeight: 1,
        goldCost: 0,
        hp: 5,
        maxHp: 5,
        size: '1x1',
        movement: { range: 3, directions: 'omnidirectional' },
        attacks: [],
        abilities: [
            {
                name: 'Self-Destruct',
                type: 'explode',
                range: 0,
                damageMin: 5,
                damageMax: 5,
                description: 'Explode on contact with an enemy for 5 damage. Destroys self.'
            }
        ],
        spawned: true,
        description: 'Expendable drone. Walks up to enemies and explodes.',
        symbol: 'Cr'
    }
};

FACTIONS.robots.mechanic = {
    name: 'Paralysis by Analysis',
    description: 'Robots use hacking, reflection, and illusions to make opponents fear every action.'
};

// ============================================================
// ALIENS
// ============================================================

FACTIONS.aliens.units = {
    stalker: {
        name: 'Stalker',
        deploymentWeight: 8,
        goldCost: 55,
        hp: 25,
        maxHp: 25,
        size: '1x1',
        movement: { range: 4, directions: 'omnidirectional' },
        attacks: [
            {
                name: 'Plasma Blade',
                range: 1,
                direction: 'adjacent',
                damageMin: 15,
                damageMax: 20,
                bursts: 1,
                type: 'melee',
                stealthBonus: true,
                stealthDamage: 20
            }
        ],
        passive: {
            name: 'Active Camouflage',
            description: 'Invisible until attacking or revealed by Recon abilities.'
        },
        description: 'Invisible assassin. Guaranteed max damage from stealth.',
        symbol: 'St'
    },
    beam_weaver: {
        name: 'Beam-Weaver',
        deploymentWeight: 10,
        goldCost: 45,
        hp: 30,
        maxHp: 30,
        size: '1x1',
        movement: { range: 2, directions: 'omnidirectional' },
        attacks: [
            {
                name: 'Pulse Ray',
                range: 3,
                direction: 'omnidirectional',
                damageMin: 4,
                damageMax: 6,
                bursts: 1,
                type: 'projectile'
            }
        ],
        abilities: [
            {
                name: 'Plasma Fence',
                type: 'laser_fence',
                maxDistance: 6,
                damage: 12,
                description: 'Place 2 nodes up to 6 squares apart. A laser connects them. Any unit crossing takes 12 damage.'
            }
        ],
        description: 'Laser architect. Creates plasma fences that damage anyone crossing.',
        symbol: 'BW'
    },
    void_skiff: {
        name: 'Void-Skiff',
        deploymentWeight: 15,
        goldCost: 90,
        hp: 60,
        maxHp: 60,
        size: '1x1',
        movement: { range: 6, directions: 'flying' },
        canTransport: true,
        transportMax: 5,
        transportMaxWeight: 10,
        attacks: [],
        abilities: [
            {
                name: 'Rapid Deployment',
                type: 'beam_down',
                description: 'Deploy all carried units into adjacent empty squares in a single turn.'
            }
        ],
        description: 'Flying transport. Warps across the board and beams down units.',
        symbol: 'VS'
    },
    prism_archon: {
        name: 'Prism-Archon',
        deploymentWeight: 12,
        goldCost: 70,
        hp: 30,
        maxHp: 30,
        size: '1x1',
        movement: { range: 3, directions: 'omnidirectional' },
        attacks: [],
        abilities: [
            {
                name: 'Frequency Shift',
                type: 'frequency',
                frequencies: {
                    red: { name: 'Red - Disintegration', damage: [12, 15] },
                    yellow: { name: 'Yellow - Neuro-Static', effect: 'stun_blind' },
                    blue: { name: 'Blue - Gravity Anchor', effect: 'ground' },
                    green: { name: 'Green - Molecular Repair', healPerTurn: 5 }
                },
                description: 'Change the frequency of all Plasma Fences on the board.'
            }
        ],
        passive: {
            name: 'Resonance Node',
            description: 'Acts as a mobile anchor for Beam-Weaver lasers. The laser moves with the Archon.'
        },
        description: 'Modulator. Changes plasma fence modes. Acts as mobile laser anchor.',
        symbol: 'PA'
    },
    mirage_node_alien: {
        name: 'Mirage-Node',
        deploymentWeight: 5,
        goldCost: 30,
        hp: 15,
        maxHp: 15,
        size: '1x1',
        movement: { range: 3, directions: 'omnidirectional' },
        attacks: [],
        abilities: [
            {
                name: 'Holographic Projection',
                type: 'hologram',
                description: 'Create a Phantom duplicate of any friendly unit. Looks real but deals 0 damage.'
            }
        ],
        description: 'Illusionist. Creates phantom duplicates to deceive opponents.',
        symbol: 'MR'
    }
};

FACTIONS.aliens.mechanic = {
    name: 'Dark Matter Fog',
    description: 'Once per match, sacrifice a unit\'s turn to create a 3x3 Dark Matter Fog. No unit inside can be targeted for 1 turn.',
    usesPerMatch: 1
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getUnitDef(faction, unitType) {
    return FACTIONS[faction].units[unitType];
}

function createUnitInstance(faction, unitType, playerId) {
    const def = getUnitDef(faction, unitType);
    if (!def) return null;
    return {
        id: `${playerId}_${unitType}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: unitType,
        faction: faction,
        playerId: playerId,
        name: def.name,
        hp: def.hp,
        maxHp: def.maxHp,
        size: def.size,
        symbol: def.symbol,
        movement: { ...def.movement },
        attacks: def.attacks ? def.attacks.map(a => ({ ...a, currentReload: 0 })) : [],
        abilities: def.abilities ? def.abilities.map(a => ({ ...a })) : [],
        passive: def.passive ? { ...def.passive } : null,
        aura: def.aura ? { ...def.aura } : null,
        deploymentWeight: def.deploymentWeight,
        goldCost: def.goldCost,

        // State
        row: -1,
        col: -1,
        facing: playerId === 1 ? 'south' : 'north',
        hasMoved: false,
        hasActed: false,
        isVisible: def.passive?.name !== 'Active Camouflage',
        isRevealed: false,
        isPhantom: false,
        infectionPoints: 0,
        debuffs: [],
        buffs: [],
        isAlive: true,
        carriedUnits: [],
        isInVehicle: false,
        vehicleId: null,
        turnsOnBoard: 0,

        // For 2x2 units
        footprint: def.size === '2x2' ? [[0, 0], [0, 1], [1, 0], [1, 1]] : [[0, 0]],
    };
}

function rollDamage(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollBackstabDamage(min, max) {
    // Heavily weighted toward max
    const roll1 = Math.floor(Math.random() * (max - min + 1)) + min;
    const roll2 = Math.floor(Math.random() * (max - min + 1)) + min;
    return Math.max(roll1, roll2);
}
