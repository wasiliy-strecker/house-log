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

const native = vi.hoisted(() => ({
  scrollToOffset: vi.fn(),
  timings: vi.fn(),
}));
vi.mock('react-native', async () => {
  const React = await import('react');
  class Value {
    value: number;
    listeners = new Map<string, (event: { value: number }) => void>();
    constructor(value: number) {
      this.value = value;
    }
    setValue(value: number) {
      this.value = value;
      this.listeners.forEach((f) => f({ value }));
    }
    addListener(f: (event: { value: number }) => void) {
      this.listeners.set('listener', f);
      return 'listener';
    }
    removeListener(id: string) {
      this.listeners.delete(id);
    }
    stopAnimation() {}
    interpolate() {
      return this;
    }
  }
  return {
    Image: 'Image',
    Pressable: 'Pressable',
    View: 'View',
    Text: 'Text',
    Modal: 'Modal',
    useWindowDimensions: () => ({ width: 400, height: 800 }),
    Easing: { out: () => 'cubic', cubic: 'cubic' },
    Animated: {
      View: 'AnimatedView',
      Value,
      timing: (
        value: Value,
        config: { toValue: number; duration: number },
      ) => ({
        start: (done?: (event: { finished: boolean }) => void) => {
          native.timings(config);
          value.setValue(config.toValue);
          done?.({ finished: true });
        },
      }),
    },
    FlatList: React.forwardRef(function MockFlatList(props: object, ref) {
      React.useImperativeHandle(ref, () => ({
        scrollToOffset: native.scrollToOffset,
      }));
      return React.createElement('FlatList', props);
    }),
  };
});
vi.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: 'GestureRoot',
}));
vi.mock('../src/features/media/zoomable-photo', () => ({
  ZoomablePhoto: 'ZoomablePhoto',
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
    const before = root().findAll(host('FlatList'))[0];
    await act(async () => button.props.onPress());
    if (thumbnail) {
      await act(async () =>
        root()
          .findAll(host('View'))
          .find((v) => v.props.onLayout)!
          .props.onLayout({ nativeEvent: { layout: { height: 696 } } }),
      );
    } else if (label.includes('Foto') && !label.includes('schließen')) {
      expect(root().find(host('FlatList'))).toBe(before);
      expect(native.timings).toHaveBeenLastCalledWith(
        expect.objectContaining({ duration: 200 }),
      );
    }
  };
  const swipe = async (index: number) => {
    const list = root().find(host('FlatList'));
    await act(async () =>
      list.props.onMomentumScrollEnd({
        nativeEvent: { contentOffset: { x: 400 * index } },
      }),
    );
    expect(root().find(host('FlatList'))).toBe(list);
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
    if (native.scrollToOffset.mock.calls.length)
      expect(native.scrollToOffset).toHaveBeenLastCalledWith({
        offset: (page - 1) * 400,
        animated: false,
      });
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
  expect(root().findAll(host('FlatList'))).toHaveLength(0);
  native.scrollToOffset.mockClear();
  await press('Foto 2 von 3 ansehen', true);
  expectPage(2);
  await swipe(2);
  expectPage(3);
  await press('Vorheriges Foto');
  expectPage(2);
});
