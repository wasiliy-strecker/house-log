import { afterEach, expect, it, vi } from 'vitest';
import { createElement, Fragment } from 'react';
import {
  act,
  create,
  type ReactTestRenderer,
  type ReactTestInstance,
} from 'react-test-renderer';
import type { Attachment } from '../src/core/domain/models';
import { PhotoGallery } from '../src/features/media/attachments';

vi.mock('react-native', () => ({
  Image: 'Image',
  Pressable: 'Pressable',
  View: 'View',
  Text: 'Text',
  Animated: { View: 'AnimatedView' },
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
  StyleSheet: { create: (v: unknown) => v },
  VirtualizedList: 'VirtualizedList',
  Modal: 'Modal',
}));
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));
vi.mock('expo-router', () => ({ router: {} }));
vi.mock('../src/core/ui/components', () => ({
  Body: 'Body',
  Button: 'Button',
  Card: 'Card',
  IconButton: 'IconButton',
  useTheme: () => ({ background: '#fff', primary: '#00f', danger: '#f00' }),
}));
vi.mock('../src/core/ui/icon', () => ({ Icon: 'Icon' }));
vi.mock('../src/core/composition', () => ({
  useServices: () => ({
    house: { vault: { uri: (key: string) => `file:///${key}` } },
  }),
}));
vi.mock('../src/core/ui/feedback', () => ({ useFeedback: () => ({}) }));
vi.mock('../src/core/ui/sortable', () => ({
  Sortable: ({
    items,
    render,
  }: {
    items: Attachment[];
    render: (a: Attachment, i: number, tap: () => boolean) => React.ReactNode;
  }) =>
    createElement(
      'Sortable',
      null,
      items.map((item, i) =>
        createElement(
          Fragment,
          { key: item.id },
          render(item, i, () => true),
        ),
      ),
    ),
}));
vi.mock(
  'react-native-image-viewing/dist/components/ImageItem/ImageItem.android.js',
  () => ({ default: () => null }),
);
vi.mock(
  'react-native-image-viewing/dist/components/ImageDefaultHeader',
  () => ({ default: () => null }),
);
vi.mock('react-native-image-viewing/dist/components/StatusBarManager', () => ({
  default: () => null,
}));
vi.mock('react-native-image-viewing/dist/hooks/useAnimatedComponents', () => ({
  default: () => [[], [], () => {}],
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const host = (name: string) => (node: ReactTestInstance) => node.type === name;
let renderer: ReactTestRenderer | undefined;
afterEach(async () => {
  if (renderer) await act(async () => renderer!.unmount());
  renderer = undefined;
});

it('keeps actual viewer index, both counters and arrows aligned after mixed swipes and button navigation', async () => {
  const photos: Attachment[] = [0, 1, 2].map((i) => ({
    id: String(i),
    name: `${i}.jpg`,
    kind: 'photo',
    file: `${i}.jpg`,
    sha256: '',
    size: 1,
  }));
  await act(async () => {
    renderer = create(createElement(PhotoGallery, { photos }));
  });
  const root = () => renderer!.root;
  const press = async (label: string, thumbnail = false) => {
    const button = root().findByProps(
      thumbnail ? { accessibilityLabel: label } : { label },
    );
    expect(button.props.disabled).not.toBe(true);
    await act(async () => button.props.onPress());
  };
  const swipe = async (index: number) => {
    const list = root().find(host('VirtualizedList'));
    await act(async () =>
      list.props.onMomentumScrollEnd({
        nativeEvent: { contentOffset: { x: 400 * index } },
      }),
    );
    expect(root().find(host('VirtualizedList'))).toBe(list);
  };
  const expectPage = (page: number) => {
    expect(
      root()
        .findAll(host('Text'))
        .find((n) => n.children[0] === 'Foto ')
        ?.children.join(''),
    ).toBe(`Foto ${page} von 3`);
    expect(
      root()
        .findAll(host('Body'))
        .find((n) => n.children.includes(' / '))
        ?.children.join(''),
    ).toBe(`${page} / 3`);
    expect(
      root().findByProps({ label: 'Vorheriges Foto' }).props.disabled,
    ).toBe(page === 1);
    expect(root().findByProps({ label: 'Nächstes Foto' }).props.disabled).toBe(
      page === 3,
    );
  };
  await press('Foto 1 von 3 ansehen', true);
  expectPage(1);
  await swipe(1);
  expectPage(2);
  await press('Vorheriges Foto');
  expectPage(1);
  await press('Nächstes Foto');
  expectPage(2);
  await swipe(0);
  expectPage(1);
  await press('Nächstes Foto');
  expectPage(2);
  await press('Nächstes Foto');
  expectPage(3);
  await press('Fotogalerie schließen');
  expect(root().findAll(host('VirtualizedList'))).toHaveLength(0);
  await press('Foto 2 von 3 ansehen', true);
  expectPage(2);
  await swipe(2);
  expectPage(3);
  await press('Vorheriges Foto');
  expectPage(2);
});
