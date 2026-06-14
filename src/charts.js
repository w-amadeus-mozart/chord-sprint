// Built-in song charts for Falling Chords mode.
// Each event: { beat, rootPc, typeName }
//   beat:     1-indexed beat number when the chord should hit the hit zone
//   rootPc:   0–11  (C=0, C#=1, D=2, … B=11)
//   typeName: must match a ChordEngine.CHORD_TYPES[n].name exactly

export const CHARTS = [
  {
    id: 'four-chord-pop',
    title: 'Four Chord Pop',
    subtitle: 'C – G – Am – F forever',
    bpm: 80,
    difficulty: 1,
    totalBeats: 33, // last beat + 1 for end-detection buffer
    events: [
      // 4 measures × (C G Am F), one chord every 2 beats
      { beat: 1,  rootPc: 0, typeName: 'Major' }, // C
      { beat: 3,  rootPc: 7, typeName: 'Major' }, // G
      { beat: 5,  rootPc: 9, typeName: 'Minor' }, // Am
      { beat: 7,  rootPc: 5, typeName: 'Major' }, // F
      { beat: 9,  rootPc: 0, typeName: 'Major' },
      { beat: 11, rootPc: 7, typeName: 'Major' },
      { beat: 13, rootPc: 9, typeName: 'Minor' },
      { beat: 15, rootPc: 5, typeName: 'Major' },
      { beat: 17, rootPc: 0, typeName: 'Major' },
      { beat: 19, rootPc: 7, typeName: 'Major' },
      { beat: 21, rootPc: 9, typeName: 'Minor' },
      { beat: 23, rootPc: 5, typeName: 'Major' },
      { beat: 25, rootPc: 0, typeName: 'Major' },
      { beat: 27, rootPc: 7, typeName: 'Major' },
      { beat: 29, rootPc: 9, typeName: 'Minor' },
      { beat: 31, rootPc: 5, typeName: 'Major' },
    ],
  },

  {
    id: 'blues-shuffle',
    title: 'Blues Shuffle',
    subtitle: '12-bar blues in C, dom7 chords',
    bpm: 92,
    difficulty: 2,
    totalBeats: 49,
    events: [
      // 12-bar blues × 2 choruses, one chord every 2 beats
      // Chorus 1
      { beat: 1,  rootPc: 0, typeName: 'Dominant 7th' }, // C7
      { beat: 3,  rootPc: 0, typeName: 'Dominant 7th' }, // C7
      { beat: 5,  rootPc: 5, typeName: 'Dominant 7th' }, // F7
      { beat: 7,  rootPc: 5, typeName: 'Dominant 7th' }, // F7
      { beat: 9,  rootPc: 0, typeName: 'Dominant 7th' }, // C7
      { beat: 11, rootPc: 0, typeName: 'Dominant 7th' }, // C7
      { beat: 13, rootPc: 7, typeName: 'Dominant 7th' }, // G7
      { beat: 15, rootPc: 5, typeName: 'Dominant 7th' }, // F7
      { beat: 17, rootPc: 0, typeName: 'Dominant 7th' }, // C7
      { beat: 19, rootPc: 7, typeName: 'Dominant 7th' }, // G7
      { beat: 21, rootPc: 0, typeName: 'Dominant 7th' }, // C7
      { beat: 23, rootPc: 7, typeName: 'Dominant 7th' }, // G7 (turnaround)
      // Chorus 2
      { beat: 25, rootPc: 0, typeName: 'Dominant 7th' },
      { beat: 27, rootPc: 0, typeName: 'Dominant 7th' },
      { beat: 29, rootPc: 5, typeName: 'Dominant 7th' },
      { beat: 31, rootPc: 5, typeName: 'Dominant 7th' },
      { beat: 33, rootPc: 0, typeName: 'Dominant 7th' },
      { beat: 35, rootPc: 0, typeName: 'Dominant 7th' },
      { beat: 37, rootPc: 7, typeName: 'Dominant 7th' },
      { beat: 39, rootPc: 5, typeName: 'Dominant 7th' },
      { beat: 41, rootPc: 0, typeName: 'Dominant 7th' },
      { beat: 43, rootPc: 7, typeName: 'Dominant 7th' },
      { beat: 45, rootPc: 0, typeName: 'Dominant 7th' },
      { beat: 47, rootPc: 7, typeName: 'Dominant 7th' },
    ],
  },

  {
    id: 'jazz-moves',
    title: 'Jazz Moves',
    subtitle: 'ii–V–I in C, F and B♭',
    bpm: 100,
    difficulty: 3,
    totalBeats: 49,
    events: [
      // ii–V–I in C  (Dm7 → G7 → Cmaj7 × 2)
      { beat: 1,  rootPc: 2,  typeName: 'Minor 7th'    }, // Dm7
      { beat: 3,  rootPc: 7,  typeName: 'Dominant 7th' }, // G7
      { beat: 5,  rootPc: 0,  typeName: 'Major 7th'    }, // Cmaj7
      { beat: 7,  rootPc: 0,  typeName: 'Major 7th'    }, // Cmaj7
      // ii–V–I in F  (Gm7 → C7 → Fmaj7 × 2)
      { beat: 9,  rootPc: 7,  typeName: 'Minor 7th'    }, // Gm7
      { beat: 11, rootPc: 0,  typeName: 'Dominant 7th' }, // C7
      { beat: 13, rootPc: 5,  typeName: 'Major 7th'    }, // Fmaj7
      { beat: 15, rootPc: 5,  typeName: 'Major 7th'    }, // Fmaj7
      // ii–V–I in Bb (Cm7 → F7 → Bbmaj7 × 2)
      { beat: 17, rootPc: 0,  typeName: 'Minor 7th'    }, // Cm7
      { beat: 19, rootPc: 5,  typeName: 'Dominant 7th' }, // F7
      { beat: 21, rootPc: 10, typeName: 'Major 7th'    }, // Bbmaj7
      { beat: 23, rootPc: 10, typeName: 'Major 7th'    }, // Bbmaj7
      // Repeat
      { beat: 25, rootPc: 2,  typeName: 'Minor 7th'    },
      { beat: 27, rootPc: 7,  typeName: 'Dominant 7th' },
      { beat: 29, rootPc: 0,  typeName: 'Major 7th'    },
      { beat: 31, rootPc: 0,  typeName: 'Major 7th'    },
      { beat: 33, rootPc: 7,  typeName: 'Minor 7th'    },
      { beat: 35, rootPc: 0,  typeName: 'Dominant 7th' },
      { beat: 37, rootPc: 5,  typeName: 'Major 7th'    },
      { beat: 39, rootPc: 5,  typeName: 'Major 7th'    },
      { beat: 41, rootPc: 0,  typeName: 'Minor 7th'    },
      { beat: 43, rootPc: 5,  typeName: 'Dominant 7th' },
      { beat: 45, rootPc: 10, typeName: 'Major 7th'    },
      { beat: 47, rootPc: 10, typeName: 'Major 7th'    },
    ],
  },

  {
    id: 'chromatic-storm',
    title: 'Chromatic Storm',
    subtitle: 'All 11 chord types, 1 per beat',
    bpm: 116,
    difficulty: 4,
    totalBeats: 33,
    events: [
      // Round 1 — one chord per beat, all types represented
      { beat: 1,  rootPc: 0,  typeName: 'Major'            }, // C
      { beat: 2,  rootPc: 9,  typeName: 'Minor'            }, // Am
      { beat: 3,  rootPc: 2,  typeName: 'Diminished'       }, // Ddim
      { beat: 4,  rootPc: 4,  typeName: 'Augmented'        }, // Eaug
      { beat: 5,  rootPc: 7,  typeName: 'Dominant 7th'     }, // G7
      { beat: 6,  rootPc: 0,  typeName: 'Major 7th'        }, // Cmaj7
      { beat: 7,  rootPc: 2,  typeName: 'Minor 7th'        }, // Dm7
      { beat: 8,  rootPc: 11, typeName: 'Half-dim (m7b5)'  }, // Bm7b5
      { beat: 9,  rootPc: 7,  typeName: 'Diminished 7th'   }, // Gdim7
      { beat: 10, rootPc: 0,  typeName: 'Sus2'             }, // Csus2
      { beat: 11, rootPc: 5,  typeName: 'Sus4'             }, // Fsus4
      // Round 2 — transposed
      { beat: 12, rootPc: 5,  typeName: 'Major'            }, // F
      { beat: 13, rootPc: 2,  typeName: 'Minor'            }, // Dm
      { beat: 14, rootPc: 6,  typeName: 'Diminished'       }, // F#dim
      { beat: 15, rootPc: 9,  typeName: 'Augmented'        }, // Aaug
      { beat: 16, rootPc: 0,  typeName: 'Dominant 7th'     }, // C7
      { beat: 17, rootPc: 5,  typeName: 'Major 7th'        }, // Fmaj7
      { beat: 18, rootPc: 7,  typeName: 'Minor 7th'        }, // Gm7
      { beat: 19, rootPc: 4,  typeName: 'Half-dim (m7b5)'  }, // Em7b5
      { beat: 20, rootPc: 3,  typeName: 'Diminished 7th'   }, // Ebdim7
      { beat: 21, rootPc: 7,  typeName: 'Sus2'             }, // Gsus2
      { beat: 22, rootPc: 2,  typeName: 'Sus4'             }, // Dsus4
      // Round 3 — up a 5th again, faster finish
      { beat: 23, rootPc: 9,  typeName: 'Major'            }, // A
      { beat: 24, rootPc: 6,  typeName: 'Minor'            }, // F#m
      { beat: 25, rootPc: 11, typeName: 'Diminished'       }, // Bdim
      { beat: 26, rootPc: 1,  typeName: 'Augmented'        }, // C#aug
      { beat: 27, rootPc: 10, typeName: 'Dominant 7th'     }, // Bb7
      { beat: 28, rootPc: 9,  typeName: 'Major 7th'        }, // Amaj7
      { beat: 29, rootPc: 4,  typeName: 'Minor 7th'        }, // Em7
      { beat: 30, rootPc: 8,  typeName: 'Half-dim (m7b5)'  }, // Abm7b5
      { beat: 31, rootPc: 6,  typeName: 'Diminished 7th'   }, // F#dim7
      { beat: 32, rootPc: 10, typeName: 'Sus2'             }, // Bbsus2
    ],
  },
];
