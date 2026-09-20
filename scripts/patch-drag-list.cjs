// React Native 0.86 Fabric requires host refs instead of numeric node handles.
// Keep this small compatibility patch pinned and fail visibly on upstream drift.
const fs = require('node:fs');
const path = require('node:path');
const root = path.dirname(
  require.resolve('react-native-draggable-flatlist/package.json'),
);
const pkg = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
);
if (pkg.version !== '4.0.3')
  throw new Error(
    'Recheck the Hausakte Fabric measurement patch for the new draggable-flatlist version.',
  );
const file = path.join(root, 'src/components/NestableDraggableFlatList.tsx');
let source = fs.readFileSync(file, 'utf8');
const old = 'const nodeHandle = findNodeHandle(scrollableRef.current);';
const replacement =
  'const nodeHandle = scrollableRef.current?.getNativeScrollRef?.() ?? scrollableRef.current; // Hausakte Fabric host ref';
if (source.includes(old)) source = source.replace(old, replacement);
else if (!source.includes(replacement))
  throw new Error(
    'Unexpected draggable-flatlist source. Refusing an unverified patch.',
  );
source = source.replace(
  '    console.reportErrorsAsExceptions = false;',
  '    // Keep React Native error reporting enabled.',
);
fs.writeFileSync(file, source);
