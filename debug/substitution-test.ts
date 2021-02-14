import { spawnSync } from 'child_process';
import { Variables } from '../src/variables';

// https://www.cyberciti.biz/tips/bash-shell-parameter-substitution-2.html

const substitutions = [
  // ['app-uva-hva-prd','${var::-8}'    ],
  // ['app-uva-hva-prd','${var:4:7}'    ],
  // ['app-uva-hva-prd','${var:8:16}'   ],
  ['uva-prd','${var%%-*}'     ],
  ['uva-prd','${var##*-}'     ],
  ['app-uva-hva-prd','${var%%-*}'     ],
  ['app-uva-hva-prd','${var##*-}'     ],

  // ['app-uva=hva-prd','${var%%*}'      ],
  // ['app-uva=hva-prd','${var%%=*}'     ],
  // ['app-uva=hva-prd','${var%%-*}'     ],
  // ['app-uva=hva-prd','${var%%-*=*}'   ],
  // ['app-uva=hva-prd','${var%%=*-*}'   ],
  // ['app-uva=hva-prd','${var%%uva}'    ],

  // ['app-uva-hva-prd','${var%%=*}'    ],
  // ['app-uva-hva-prd','${var%%-*}'    ],
  // ['app-uva-hva-prd','${var%%-*=*}'  ],
  // ['app-uva-hva-prd','${var%%-*=*=*}'],

  // ['app-uva-hva-prd','${var%=*}'     ],
  // ['app-uva-hva-prd','${var%-*}'     ],
  // ['app-uva-hva-prd','${var%-*=*}'   ],
  // ['app-uva-hva-prd','${var%-*=*=*}' ],

  // ['app-uva-hva-prd','${var%=*}'     ],
  // ['app-uva-hva-prd','${var%-*}'     ],
  // ['app-uva-hva-prd','${var%-*=*}'   ],
  // ['app-uva-hva-prd','${var%-*=*=*}' ],

  // ['app-uva-hva-prd','${var##*=}'    ],
  // ['app-uva-hva-prd','${var##*-}'    ],
  // ['app-uva-hva-prd','${var##*-*=}'  ],
  // ['app-uva-hva-prd','${var##*-*=*=}'],

  // ['app-uva-hva-prd','${var##*=}'    ],
  // ['app-uva-hva-prd','${var##*-}'    ],
  // ['app-uva-hva-prd','${var##*-*=}'  ],
  // ['app-uva-hva-prd','${var##*-*=*=}'],

  // ['app-uva-hva-prd','${var#*=}'     ],
  // ['app-uva-hva-prd','${var#*-}'     ],
  // ['app-uva-hva-prd','${var#*-*=}'   ],
  // ['app-uva-hva-prd','${var#*-*=*=}' ],

  // ['app-uva-hva-prd','${var#*=}'     ],
  // ['app-uva-hva-prd','${var#*-}'     ],
  // ['app-uva-hva-prd','${var#*-*=}'   ],
  // ['app-uva-hva-prd','${var#*-*=*=}' ],

  // ['app-uva-hva-prd','${var/-/=}'    ],
  // ['app-uva-hva-prd','${var//-/=}'   ],
  // ['APP-UVA-HVA-PRD','${var,,}'      ],
  // ['APP-UVA-HVA-PRD','${var,}'       ],
  // ['app-uva-hva-prd','${var^^}'      ],
  // ['app-uva-hva-prd','${var^}'       ],
];

let errors = 0;

console.log('substitution    input                          ouput   expected             result');
console.log('----------------------------------------------------------------------------------');

for (const [input,substitution] of substitutions) {
  const ouput = Variables.expand(substitution,[
    ['var',input]
  ]);

  const result = spawnSync('bash',['-c','var='+input+' ; echo ' + substitution]);
  const expected = result.stdout.toString().trim();
  const success = expected===ouput;

  // console.log('substitution:',substitution);
  // console.log('       input:',input);
  // console.log('       ouput:',ouput);
  // console.log('    expected:',expected.padEnd(40) + ' ' + (success?'oke':'error'));
  // console.log();
  console.log(substitution.padEnd(16) + input.padEnd(15) +'    ( '+ ouput.padStart(15) +' = '+expected.padEnd(15) + ' )    ' + (success?'oke':'error') );

  if (!success) errors++;
}

console.log();
console.log('Errors:',errors);
