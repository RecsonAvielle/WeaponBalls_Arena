import { SwordWeapon }            from '../weapons/SwordWeapon.js';
import { DaggerWeapon }           from '../weapons/DaggerWeapon.js';
import { SiphonWeapon }           from '../weapons/SiphonWeapon.js';
import { ChanceWeapon }           from '../weapons/ChanceWeapon.js';
import { FrostWeapon }            from '../weapons/FrostWeapon.js';
import { RushWeapon }             from '../weapons/RushWeapon.js';
import { SpikeWeapon }            from '../weapons/SpikeWeapon.js';
import { ArcherWeapon }           from '../weapons/ArcherWeapon.js';
import { PelletWeapon }           from '../weapons/PelletWeapon.js';
import { ShotgunWeapon }          from '../weapons/ShotgunWeapon.js';
import { VenomWeapon }            from '../weapons/VenomWeapon.js';
import { ZipWeapon }              from '../weapons/ZipWeapon.js';
import { DummyWeapon }            from '../weapons/DummyWeapon.js';
import { GuardWeapon }            from '../weapons/GuardWeapon.js';
import { SurgeWeapon }            from '../weapons/SurgeWeapon.js';
import { ShieldWeapon }           from '../weapons/ShieldWeapon.js';
import { ShockWeapon }            from '../weapons/ShockWeapon.js';
import { SnipeWeapon }            from '../weapons/SnipeWeapon.js';
import { BlackholeWeapon }        from '../weapons/BlackholeWeapon.js';
import { HostessWeapon }          from '../weapons/HostessWeapon.js';
import { MenderWeapon }           from '../weapons/MenderWeapon.js';
import { LaserWeapon }            from '../weapons/LaserWeapon.js';
import { TurretWeapon }           from '../weapons/TurretWeapon.js';

export function getBallConfigs(systems) {
  const { frostAreaSys, spikes, projSys, trails, shockSys, bhSys, minionSys, menderSys, laserSys, turretSys } = systems;
  
  return [
    { id: 'sword',   color: '#E63946', name: 'Sword',   spinSpeed:  6.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new SwordWeapon()            },
    { id: 'dagger',  color: '#F4A261', name: 'Dagger',  spinSpeed:  6.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new DaggerWeapon()           },
    { id: 'siphon',   color: '#457B9D', name: 'Siphon',   spinSpeed:  6.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new SiphonWeapon()            },
    { id: 'chance',  color: '#6D4C9C', name: 'Chance',  spinSpeed:  6.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new ChanceWeapon()           },
    { id: 'frost',   color: '#2A9D8F', name: 'Frost',   spinSpeed: -6.28, maxSpeed: 700, gravityScale: 1.0,  weapon: () => new FrostWeapon(frostAreaSys) },
    { id: 'rush',    color: '#E76F51', name: 'Rush',    spinSpeed:  0,    maxSpeed: 650, gravityScale: 0.45, weapon: () => new RushWeapon(),  trail: true  },
    { id: 'spike', color: '#A0522D', name: 'Spike', spinSpeed:  6.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new SpikeWeapon(spikes)    },
    { id: 'archer',  color: '#D4A017', name: 'Archer',  spinSpeed:  0,    maxSpeed: 700, gravityScale: 1.0,  weapon: () => new ArcherWeapon(projSys)    },
    { id: 'pellet',  color: '#52B788', name: 'Pellet',  spinSpeed:  4.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new PelletWeapon(projSys)    },
    { id: 'shotgun', color: '#7EC8A4', name: 'Shotgun', spinSpeed:  6.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new ShotgunWeapon(projSys)   },
    { id: 'venom',   color: '#A8C256', name: 'Venom',   spinSpeed:  6.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new VenomWeapon()            },
    { id: 'zip',     color: '#38BDF8', name: 'Zip',     spinSpeed:  0,    maxSpeed: 900, gravityScale: 0.3,  weapon: () => new ZipWeapon(trails)        },
    { id: 'dummy',   color: '#9CA3AF', name: 'Dummy',   spinSpeed:  0,    maxSpeed: 700, gravityScale: 1.0,  weapon: () => new DummyWeapon(), maxHp: 500 },
    { id: 'guard',   color: '#6B8CAE', name: 'Guard',   spinSpeed:  6.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new GuardWeapon()            },
    { id: 'surge',   color: '#C1121F', name: 'Surge',   spinSpeed:  6.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new SurgeWeapon()            },
    { id: 'shield',  color: '#8D99AE', name: 'Shield',  spinSpeed:  3.1,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new ShieldWeapon()           },
    { id: 'shock',     color: '#F5C518', name: 'Shock',     spinSpeed:  0,    maxSpeed: 700, gravityScale: 1.0,  weapon: () => new ShockWeapon(shockSys)    },
    { id: 'snipe',     color: '#1B4332', name: 'Snipe',     spinSpeed:  0,    maxSpeed: 700, gravityScale: 1.0,  weapon: () => new SnipeWeapon(projSys)     },
    { id: 'blackhole', color: '#4A0E8F', name: 'Blackhole', spinSpeed:  0,    maxSpeed: 700, gravityScale: 1.0,  weapon: () => new BlackholeWeapon(bhSys)   },
    { id: 'hostess',   color: '#FF6B9D', name: 'Hostess',   spinSpeed:  0,    maxSpeed: 900, gravityScale: 0.3,  weapon: () => new HostessWeapon(minionSys) },
    { id: 'turret',    color: '#4682B4', name: 'Turret',    spinSpeed:  5.0,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new TurretWeapon(turretSys)  },
    { id: 'mender',    color: '#4CAF50', name: 'Mender',    spinSpeed: 0,     maxSpeed: 700, gravityScale: 1.0,  weapon: () => new MenderWeapon(menderSys)  },
    { id: 'laser',     color: '#FF3D00', name: 'Laser',     spinSpeed: 0,     maxSpeed: 700, gravityScale: 1.0,  weapon: () => new LaserWeapon(laserSys)    },
  ];
}
