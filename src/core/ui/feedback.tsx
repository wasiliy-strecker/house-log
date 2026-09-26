import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './icon';
import { useTheme } from './theme';
import {
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSheetDrag } from './use-sheet-drag';
export type Choice = {
  value: string;
  label: string;
  description?: string;
  icon?: IconName;
  disabled?: boolean;
  danger?: boolean;
};
export type MenuAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};
type Question = {
  title: string;
  message?: string;
  options: Choice[];
  dialog?: boolean;
  anchor?: MenuAnchor;
};
type Feedback = {
  choose(q: Question): Promise<string | null>;
  confirm(
    title: string,
    message: string,
    accept?: string,
    danger?: boolean,
  ): Promise<boolean>;
  notify(message: string): void;
};
const Context = createContext<Feedback | null>(null);
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const c = useTheme();
  const safe = useSafeAreaInsets();
  const window = useWindowDimensions();
  const [question, setQuestion] = useState<Question>();
  const resolve = useRef<((v: string | null) => void) | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 6500);
      return () => clearTimeout(timer);
    }
  }, [message]);
  const choose = useCallback(
    (q: Question) =>
      new Promise<string | null>((done) => {
        resolve.current?.(null);
        resolve.current = done;
        setQuestion(q);
      }),
    [],
  );
  const finish = useCallback((value: string | null) => {
    setQuestion(undefined);
    resolve.current?.(value);
    resolve.current = null;
  }, []);
  const dismiss = useCallback(() => finish(null), [finish]);
  const sheet = useSheetDrag(
    !!question && !question.dialog && !question.anchor,
    question,
    dismiss,
  );
  const confirm = useCallback(
    async (title: string, message: string, accept = 'Löschen', danger = true) =>
      (await choose({
        title,
        message,
        dialog: true,
        options: [
          { value: 'cancel', label: 'Abbrechen' },
          { value: 'yes', label: accept, danger },
        ],
      })) === 'yes',
    [choose],
  );
  useEffect(
    () => () => {
      resolve.current?.(null);
    },
    [],
  );
  const text = {
    fontFamily: 'Roboto',
    fontSize: 14,
    lineHeight: 20,
    color: c.ink,
  } as const;
  return (
    <Context.Provider value={{ choose, confirm, notify: setMessage }}>
      {children}
      {!!message && (
        <View
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            bottom: safe.bottom + 12,
            left: 16,
            right: 16,
            borderRadius: 4,
            padding: 16,
            backgroundColor: c.dark ? '#E0E2E8' : '#2D3135',
            elevation: 6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Text
            style={[text, { flex: 1, color: c.dark ? '#2D3135' : '#F1F4F7' }]}
          >
            {message}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hinweis schließen"
            onPress={() => setMessage('')}
            style={{ padding: 8 }}
          >
            <Icon
              name="close"
              color={c.dark ? '#2D3135' : '#F1F4F7'}
              size={20}
            />
          </Pressable>
        </View>
      )}
      <Modal
        visible={!!question}
        transparent
        animationType="fade"
        onRequestClose={() => finish(null)}
        statusBarTranslucent
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              justifyContent: question?.dialog ? 'center' : 'flex-end',
              backgroundColor: question?.anchor ? 'transparent' : '#00000066',
              padding: question?.dialog ? 24 : 0,
            }}
          >
            <Pressable
              accessibilityLabel="Abbrechen"
              onPress={() => finish(null)}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
              }}
            />
            <GestureDetector gesture={sheet.pan}>
              <Animated.View
                accessibilityViewIsModal
                onLayout={sheet.onLayout}
                style={[
                  {
                    backgroundColor: c.elevated,
                    borderRadius: 28,
                    borderBottomLeftRadius: question?.dialog ? 28 : 0,
                    borderBottomRightRadius: question?.dialog ? 28 : 0,
                    padding: question?.dialog ? 24 : 16,
                    paddingBottom: question?.dialog ? 24 : safe.bottom + 20,
                    maxHeight: '85%',
                    maxWidth: 640,
                    width: '100%',
                    alignSelf: 'center',
                    gap: 12,
                    ...(question?.anchor
                      ? ({
                          position: 'absolute',
                          left: Math.max(
                            8,
                            Math.min(
                              question.anchor.x,
                              window.width -
                                Math.min(
                                  320,
                                  Math.max(224, question.anchor.width),
                                ) -
                                8,
                            ),
                          ),
                          top: Math.max(
                            safe.top + 8,
                            Math.min(
                              question.anchor.y + question.anchor.height,
                              window.height -
                                safe.bottom -
                                Math.min(
                                  400,
                                  question.options.length *
                                    56 *
                                    Math.max(1, window.fontScale) +
                                    16,
                                ) -
                                8,
                            ),
                          ),
                          width: Math.min(
                            window.width - 16,
                            Math.max(224, question.anchor.width),
                          ),
                          maxWidth: 400,
                          maxHeight: Math.min(
                            400,
                            window.height - safe.top - safe.bottom - 32,
                          ),
                          borderRadius: 4,
                          borderBottomLeftRadius: 4,
                          borderBottomRightRadius: 4,
                          padding: 8,
                          paddingBottom: 8,
                          gap: 0,
                          elevation: 8,
                        } as const)
                      : {}),
                  },
                  sheet.style,
                ]}
              >
                {!question?.dialog && !question?.anchor && (
                  <View
                    style={{
                      width: 32,
                      height: 4,
                      backgroundColor: c.outline,
                      borderRadius: 4,
                      alignSelf: 'center',
                      marginBottom: 8,
                    }}
                  />
                )}
                {!question?.anchor && (
                  <Text
                    accessibilityRole="header"
                    style={[
                      text,
                      {
                        fontSize: question?.dialog ? 24 : 22,
                        lineHeight: 28,
                        fontFamily: question?.dialog ? 'Roboto' : 'RobotoBold',
                      },
                    ]}
                  >
                    {question?.title}
                  </Text>
                )}
                {!!question?.message && (
                  <Text style={[text, { color: c.muted }]}>
                    {question.message}
                  </Text>
                )}
                <GestureDetector gesture={sheet.nativeScroll}>
                  <Animated.ScrollView
                    onLayout={sheet.onScrollLayout}
                    onScroll={sheet.onScroll}
                    scrollEventThrottle={16}
                    overScrollMode="never"
                    bounces={false}
                    contentContainerStyle={
                      question?.dialog
                        ? {
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            justifyContent: 'flex-end',
                            gap: 8,
                          }
                        : { gap: 8 }
                    }
                  >
                    {question?.options.map((o) => (
                      <Pressable
                        key={o.value}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: o.disabled }}
                        disabled={o.disabled}
                        onPress={() => finish(o.value)}
                        android_ripple={{ color: c.primary + '22' }}
                        style={{
                          minHeight: 48,
                          paddingHorizontal: question.dialog ? 16 : 12,
                          paddingVertical: 12,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 16,
                          borderRadius: question.dialog ? 28 : 12,
                          opacity: o.disabled ? 0.38 : 1,
                        }}
                      >
                        {!!o.icon && (
                          <Icon
                            name={o.icon}
                            color={o.danger ? c.danger : c.primary}
                          />
                        )}
                        <View style={question.dialog ? undefined : { flex: 1 }}>
                          <Text
                            style={[
                              text,
                              {
                                fontFamily: 'RobotoMedium',
                                fontSize: 16,
                                color: o.danger
                                  ? c.danger
                                  : question.dialog
                                    ? c.primary
                                    : c.ink,
                              },
                            ]}
                          >
                            {o.label}
                          </Text>
                          {!!o.description && (
                            <Text
                              style={[text, { color: c.muted, marginTop: 4 }]}
                            >
                              {o.description}
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    ))}
                  </Animated.ScrollView>
                </GestureDetector>
              </Animated.View>
            </GestureDetector>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </Context.Provider>
  );
}
export function useFeedback() {
  const value = useContext(Context);
  if (!value) throw new Error('FeedbackProvider fehlt.');
  return value;
}
