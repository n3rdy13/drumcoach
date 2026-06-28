export interface MidiProfile {
  id: string;
  name: string;
  description: string;
  mappings: {
    kick: number;
    snare: number;
    hihat: number;
  };
}

export const MIDI_PROFILES: MidiProfile[] = [
  {
    id: 'gm-default',
    name: 'General MIDI Default',
    description: 'Standard GM percussion mapping used by most software and generic pads.',
    mappings: {
      kick: 36,
      snare: 38,
      hihat: 42,
    },
  },
  {
    id: 'simmons-titan-20',
    name: 'Simmons Titan 20',
    description: 'Factory MIDI map for the Simmons Titan 20 electronic drum kit (USB/MIDI DIN).',
    mappings: {
      kick: 36,
      snare: 38,
      hihat: 42,
    },
  },
  {
    id: 'roland-td-07',
    name: 'Roland TD-07',
    description: 'Standard mapping for Roland TD-07 and TD-1 series V-Drums.',
    mappings: {
      kick: 36,
      snare: 38,
      hihat: 42,
    },
  },
  {
    id: 'alesis-nitro',
    name: 'Alesis Nitro / Strike',
    description: 'Default mapping for Alesis Nitro, Strike, and Surge mesh kits.',
    mappings: {
      kick: 36,
      snare: 38,
      hihat: 46,
    },
  },
  {
    id: 'akai-mpd',
    name: 'Akai MPD / MPC Pads',
    description: 'Common mapping for Akai MPD series pad controllers (Bank A).',
    mappings: {
      kick: 48,
      snare: 49,
      hihat: 51,
    },
  },
];
