import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ads,
  adsAvailable,
  BANNER_AD_UNIT_ID,
  INTERSTITIAL_AD_UNIT_ID,
  initializeMobileAds,
} from '@/lib/ads';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useHighScores } from '@/hooks/useHighScores';

// ─── Layout ──────────────────────────────────────────────────────────────────

const { width } = Dimensions.get('window');
const GRID_PADDING = 20;
const CARD_GAP = 8;
const CARDS_PER_ROW = 4;
const BASE_CARD_SIZE =
  (width - GRID_PADDING * 2 - CARD_GAP * (CARDS_PER_ROW - 1)) / CARDS_PER_ROW;

// ─── Theme ───────────────────────────────────────────────────────────────────

const C = {
  bg: '#07091A',
  bgCard: '#0F1535',
  bgCardBorder: '#1E2D6B',
  bgFront: '#E8EFFF',
  bgMatched: '#FFD700',
  bgMatchedBorder: '#FFA500',
  accentCyan: '#00D9FF',
  accentPurple: '#9B59FF',
  accentGreen: '#39FF14',
  accentRed: '#FF3366',
  accentGold: '#FFD700',
  panelBg: 'rgba(255,255,255,0.05)',
  panelBorder: 'rgba(255,255,255,0.10)',
  text: '#FFFFFF',
  textDim: 'rgba(255,255,255,0.45)',
  textMid: 'rgba(255,255,255,0.70)',
};

// ─── Types ───────────────────────────────────────────────────────────────────

type Card = {
  id: string;
  matchId: string;
  image: string;
  flipped: boolean;
  matched: boolean;
};

type Pack = 'alphabet' | 'doctor' | 'animals' | 'food';
type Difficulty = 'easy' | 'medium' | 'hard';

// ─── Data ─────────────────────────────────────────────────────────────────────

const DIFFICULTY_PAIRS: Record<Difficulty, number> = { easy: 4, medium: 8, hard: 12 };
const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: C.accentGreen,
  medium: C.accentCyan,
  hard: C.accentRed,
};

const CARD_SIZE_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: BASE_CARD_SIZE,
  medium: BASE_CARD_SIZE,
  hard: Math.floor(BASE_CARD_SIZE * 0.76),
};

const PACKS: Record<Pack, { id: string; matchId: string; image: string }[]> = {
  alphabet: [
    { id: 'a1', matchId: 'a', image: 'A' }, { id: 'a2', matchId: 'a', image: 'A' },
    { id: 'b1', matchId: 'b', image: 'B' }, { id: 'b2', matchId: 'b', image: 'B' },
    { id: 'c1', matchId: 'c', image: 'C' }, { id: 'c2', matchId: 'c', image: 'C' },
    { id: 'd1', matchId: 'd', image: 'D' }, { id: 'd2', matchId: 'd', image: 'D' },
    { id: 'e1', matchId: 'e', image: 'E' }, { id: 'e2', matchId: 'e', image: 'E' },
    { id: 'f1', matchId: 'f', image: 'F' }, { id: 'f2', matchId: 'f', image: 'F' },
    { id: 'g1', matchId: 'g', image: 'G' }, { id: 'g2', matchId: 'g', image: 'G' },
    { id: 'h1', matchId: 'h', image: 'H' }, { id: 'h2', matchId: 'h', image: 'H' },
    { id: 'i1', matchId: 'i', image: 'I' }, { id: 'i2', matchId: 'i', image: 'I' },
    { id: 'j1', matchId: 'j', image: 'J' }, { id: 'j2', matchId: 'j', image: 'J' },
    { id: 'k1', matchId: 'k', image: 'K' }, { id: 'k2', matchId: 'k', image: 'K' },
    { id: 'l1', matchId: 'l', image: 'L' }, { id: 'l2', matchId: 'l', image: 'L' },
  ],
  doctor: [
    { id: 'steth1', matchId: 'steth', image: '🩺' }, { id: 'steth2', matchId: 'steth', image: '🩺' },
    { id: 'syr1', matchId: 'syr', image: '💉' }, { id: 'syr2', matchId: 'syr', image: '💉' },
    { id: 'pill1', matchId: 'pill', image: '💊' }, { id: 'pill2', matchId: 'pill', image: '💊' },
    { id: 'band1', matchId: 'band', image: '🩹' }, { id: 'band2', matchId: 'band', image: '🩹' },
    { id: 'mic1', matchId: 'mic', image: '🔬' }, { id: 'mic2', matchId: 'mic', image: '🔬' },
    { id: 'xray1', matchId: 'xray', image: '🩻' }, { id: 'xray2', matchId: 'xray', image: '🩻' },
    { id: 'dna1', matchId: 'dna', image: '🧬' }, { id: 'dna2', matchId: 'dna', image: '🧬' },
    { id: 'hosp1', matchId: 'hosp', image: '🏥' }, { id: 'hosp2', matchId: 'hosp', image: '🏥' },
    { id: 'temp1', matchId: 'temp', image: '🌡️' }, { id: 'temp2', matchId: 'temp', image: '🌡️' },
    { id: 'blood1', matchId: 'blood', image: '🩸' }, { id: 'blood2', matchId: 'blood', image: '🩸' },
    { id: 'test1', matchId: 'test', image: '🧪' }, { id: 'test2', matchId: 'test', image: '🧪' },
    { id: 'tooth1', matchId: 'tooth', image: '🦷' }, { id: 'tooth2', matchId: 'tooth', image: '🦷' },
  ],
  animals: [
    { id: 'cat1', matchId: 'cat', image: '🐱' }, { id: 'cat2', matchId: 'cat', image: '🐱' },
    { id: 'dog1', matchId: 'dog', image: '🐶' }, { id: 'dog2', matchId: 'dog', image: '🐶' },
    { id: 'fox1', matchId: 'fox', image: '🦊' }, { id: 'fox2', matchId: 'fox', image: '🦊' },
    { id: 'bear1', matchId: 'bear', image: '🐻' }, { id: 'bear2', matchId: 'bear', image: '🐻' },
    { id: 'panda1', matchId: 'panda', image: '🐼' }, { id: 'panda2', matchId: 'panda', image: '🐼' },
    { id: 'koala1', matchId: 'koala', image: '🐨' }, { id: 'koala2', matchId: 'koala', image: '🐨' },
    { id: 'lion1', matchId: 'lion', image: '🦁' }, { id: 'lion2', matchId: 'lion', image: '🦁' },
    { id: 'tiger1', matchId: 'tiger', image: '🐯' }, { id: 'tiger2', matchId: 'tiger', image: '🐯' },
    { id: 'frog1', matchId: 'frog', image: '🐸' }, { id: 'frog2', matchId: 'frog', image: '🐸' },
    { id: 'butterfly1', matchId: 'butterfly', image: '🦋' }, { id: 'butterfly2', matchId: 'butterfly', image: '🦋' },
    { id: 'elephant1', matchId: 'elephant', image: '🐘' }, { id: 'elephant2', matchId: 'elephant', image: '🐘' },
    { id: 'giraffe1', matchId: 'giraffe', image: '🦒' }, { id: 'giraffe2', matchId: 'giraffe', image: '🦒' },
  ],
  food: [
    { id: 'pizza1', matchId: 'pizza', image: '🍕' }, { id: 'pizza2', matchId: 'pizza', image: '🍕' },
    { id: 'burger1', matchId: 'burger', image: '🍔' }, { id: 'burger2', matchId: 'burger', image: '🍔' },
    { id: 'ice1', matchId: 'ice', image: '🍦' }, { id: 'ice2', matchId: 'ice', image: '🍦' },
    { id: 'cake1', matchId: 'cake', image: '🎂' }, { id: 'cake2', matchId: 'cake', image: '🎂' },
    { id: 'apple1', matchId: 'apple', image: '🍎' }, { id: 'apple2', matchId: 'apple', image: '🍎' },
    { id: 'strawberry1', matchId: 'strawberry', image: '🍓' }, { id: 'strawberry2', matchId: 'strawberry', image: '🍓' },
    { id: 'grapes1', matchId: 'grapes', image: '🍇' }, { id: 'grapes2', matchId: 'grapes', image: '🍇' },
    { id: 'taco1', matchId: 'taco', image: '🌮' }, { id: 'taco2', matchId: 'taco', image: '🌮' },
    { id: 'noodle1', matchId: 'noodle', image: '🍜' }, { id: 'noodle2', matchId: 'noodle', image: '🍜' },
    { id: 'salad1', matchId: 'salad', image: '🥗' }, { id: 'salad2', matchId: 'salad', image: '🥗' },
    { id: 'donut1', matchId: 'donut', image: '🍩' }, { id: 'donut2', matchId: 'donut', image: '🍩' },
    { id: 'sushi1', matchId: 'sushi', image: '🍣' }, { id: 'sushi2', matchId: 'sushi', image: '🍣' },
  ],
};

const PACK_LABELS: Record<Pack, string> = {
  alphabet: 'ABC',
  doctor: 'Doctor',
  animals: 'Animals',
  food: 'Food',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (s: number) => {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
};

const playSound = async (type: 'correct' | 'wrong') => {
  const url =
    type === 'correct'
      ? 'https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3'
      : 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3';

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = type === 'correct' ? 880 : 220;
      g.gain.value = 0.1;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.15);
    } catch { /* not available */ }
  } else {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) sound.unloadAsync().catch(() => {});
      });
    } catch { /* non-critical */ }
  }
};

// ─── Flip Card Component ──────────────────────────────────────────────────────

type GameCardProps = {
  card: Card;
  onPress: () => void;
  cardSize: number;
  fontSize: number;
  difficultyColor: string;
};

function GameCard({ card, onPress, cardSize, fontSize, difficultyColor }: GameCardProps) {
  const flipAnim = useRef(new Animated.Value(card.flipped || card.matched ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isRevealed = card.flipped || card.matched;

  useEffect(() => {
    Animated.spring(flipAnim, {
      toValue: isRevealed ? 1 : 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [isRevealed]);

  useEffect(() => {
    if (card.matched) {
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.12, friction: 4, tension: 80, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [card.matched]);

  const backRotateY = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const frontRotateY = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] });

  const innerStyle = { width: cardSize, height: cardSize, borderRadius: 14, position: 'absolute' as const };

  return (
    <Pressable
      onPress={onPress}
      disabled={card.matched}
      style={({ pressed }) => [
        { width: cardSize, height: cardSize },
        pressed && !isRevealed && { opacity: 0.75 },
      ]}>
      <Animated.View style={{ width: cardSize, height: cardSize, transform: [{ scale: scaleAnim }] }}>
        {/* Back face */}
        <Animated.View
          style={[
            innerStyle,
            styles.cardBack,
            {
              borderColor: difficultyColor,
              shadowColor: difficultyColor,
              transform: [{ perspective: 1000 }, { rotateY: backRotateY }],
            },
          ]}>
          <Text style={[styles.cardBackText, { fontSize: fontSize * 0.9, color: difficultyColor }]}>?</Text>
          {/* Corner dots for game-board feel */}
          <View style={[styles.cornerDot, { top: 6, left: 6, backgroundColor: difficultyColor }]} />
          <View style={[styles.cornerDot, { top: 6, right: 6, backgroundColor: difficultyColor }]} />
          <View style={[styles.cornerDot, { bottom: 6, left: 6, backgroundColor: difficultyColor }]} />
          <View style={[styles.cornerDot, { bottom: 6, right: 6, backgroundColor: difficultyColor }]} />
        </Animated.View>

        {/* Front face */}
        <Animated.View
          style={[
            innerStyle,
            styles.cardFront,
            card.matched && styles.cardMatched,
            card.matched && { shadowColor: C.accentGold },
            { transform: [{ perspective: 1000 }, { rotateY: frontRotateY }] },
          ]}>
          <Text style={[styles.cardFrontText, { fontSize }]}>{card.image}</Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const { scores, saveScore, clearScores } = useHighScores();

  const [cards, setCards] = useState<Card[]>([]);
  const [moves, setMoves] = useState(0);
  const [pack, setPack] = useState<Pack>('alphabet');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameWon, setGameWon] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [interstitialReady, setInterstitialReady] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [finalCombo, setFinalCombo] = useState(0);
  const [muted, setMuted] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const comboAnim = useRef(new Animated.Value(1)).current;
  const mutedRef = useRef(false);
  const hapticsRef = useRef(true);

  const isCheckingRef = useRef(false);
  const flippedRef = useRef<string[]>([]);
  const cardsRef = useRef<Card[]>([]);
  const interstitialRef = useRef<any>(null);
  const packRef = useRef<Pack>('alphabet');
  const difficultyRef = useRef<Difficulty>('easy');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const comboRef = useRef(0);
  const bestComboRef = useRef(0);
  cardsRef.current = cards;

  // Interstitial ad setup
  useEffect(() => {
    if (!adsAvailable || !ads?.RewardedInterstitialAd || !ads?.RewardedAdEventType || !ads?.AdEventType) return;
    const interstitial = ads.RewardedInterstitialAd.createForAdRequest(
      INTERSTITIAL_AD_UNIT_ID,
      { requestNonPersonalizedAdsOnly: false }
    );
    interstitialRef.current = interstitial;
    const unsubLoad = interstitial.addAdEventListener(ads.RewardedAdEventType.LOADED, () => setInterstitialReady(true));
    const unsubClose = interstitial.addAdEventListener(ads.AdEventType.CLOSED, () => {
      setInterstitialReady(false);
      interstitial.load();
    });
    const unsubError = interstitial.addAdEventListener(ads.AdEventType.ERROR, () => setInterstitialReady(false));
    interstitial.load();
    return () => { unsubLoad(); unsubClose(); unsubError(); };
  }, []);

  useEffect(() => {
    initializeMobileAds();
    initGame('alphabet', 'easy');
  }, []);

  // Load mute preference
  useEffect(() => {
    AsyncStorage.getItem('@brainbox_muted').then(val => {
      if (val === '1') { mutedRef.current = true; setMuted(true); }
    }).catch(() => {});
  }, []);

  const toggleMute = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    AsyncStorage.setItem('@brainbox_muted', next ? '1' : '0').catch(() => {});
  };

  // Load haptics preference
  useEffect(() => {
    AsyncStorage.getItem('@brainbox_haptics').then(val => {
      if (val === '0') { hapticsRef.current = false; setHapticsEnabled(false); }
    }).catch(() => {});
  }, []);

  const toggleHaptics = () => {
    const next = !hapticsRef.current;
    hapticsRef.current = next;
    setHapticsEnabled(next);
    AsyncStorage.setItem('@brainbox_haptics', next ? '1' : '0').catch(() => {});
  };

  const handleDeleteData = () => {
    Alert.alert(
      'Delete My Data',
      'This permanently removes your high scores and preferences from this device.\n\nAd-related data collected by Google AdMob (such as device identifiers) cannot be deleted here — use the link below to manage that.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([
              '@brainbox_high_scores_v4',
              '@brainbox_muted',
              '@brainbox_haptics',
            ]);
            clearScores();
            mutedRef.current = false;
            setMuted(false);
            hapticsRef.current = true;
            setHapticsEnabled(true);
          },
        },
      ]
    );
  };

  // Cleanup timer on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setElapsedTime(0);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const triggerComboAnim = () => {
    comboAnim.setValue(1.5);
    Animated.spring(comboAnim, {
      toValue: 1,
      friction: 4,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  const initGame = (selectedPack: Pack, selectedDifficulty: Difficulty) => {
    stopTimer();
    const numPairs = DIFFICULTY_PAIRS[selectedDifficulty];
    const pairCards = PACKS[selectedPack].slice(0, numPairs * 2);
    const shuffled = [...pairCards]
      .sort(() => Math.random() - 0.5)
      .map(c => ({ ...c, flipped: false, matched: false }));
    setCards(shuffled);
    flippedRef.current = [];
    isCheckingRef.current = false;
    setMoves(0);
    setElapsedTime(0);
    setPack(selectedPack);
    packRef.current = selectedPack;
    setDifficulty(selectedDifficulty);
    difficultyRef.current = selectedDifficulty;
    setGameWon(false);
    setIsNewBest(false);
    setComboCount(0);
    setFinalCombo(0);
    comboRef.current = 0;
    bestComboRef.current = 0;
    startTimer();
  };

  const scoreKey = (p: Pack, d: Difficulty) => `${p}_${d}`;

  const triggerWin = useCallback((finalMoves: number, finalTime: number, finalComboVal: number, p: Pack, d: Difficulty) => {
    stopTimer();
    setGameWon(true);
    setFinalCombo(finalComboVal);
    const key = scoreKey(p, d);
    const best = scores[key] ?? null;
    const newBest = best === null || finalMoves < best.moves || finalTime < best.time || finalComboVal > (best.combo ?? 0);
    setIsNewBest(newBest);
    if (newBest) saveScore(key, finalMoves, finalTime, finalComboVal);
    setTimeout(() => {
      try {
        if (interstitialReady && interstitialRef.current?.loaded) interstitialRef.current.show();
      } catch { /* non-critical */ }
    }, 1500);
  }, [scores, saveScore, interstitialReady]);

  const handleFlip = useCallback((index: number) => {
    if (isCheckingRef.current) return;
    const card = cardsRef.current[index];
    if (!card || card.flipped || card.matched) return;

    setCards(prev => prev.map((c, i) => (i === index ? { ...c, flipped: true } : c)));
    const currentFlipped = [...flippedRef.current, card.id];

    if (currentFlipped.length === 2) {
      flippedRef.current = [];
      isCheckingRef.current = true;
      const newMoves = moves + 1;
      setMoves(newMoves);

      const firstCard = cardsRef.current.find(c => c.id === currentFlipped[0]);
      const isMatch = firstCard?.matchId === card.matchId;

      if (isMatch) {
        if (!mutedRef.current) playSound('correct');
        if (hapticsRef.current) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        const newCombo = comboRef.current + 1;
        comboRef.current = newCombo;
        if (newCombo > bestComboRef.current) bestComboRef.current = newCombo;
        setComboCount(newCombo);
        if (newCombo >= 2) triggerComboAnim();
        setTimeout(() => {
          setCards(prev => {
            const updated = prev.map(c =>
              c.matchId === card.matchId ? { ...c, matched: true, flipped: true } : c
            );
            if (updated.every(c => c.matched)) {
              const finalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
              triggerWin(newMoves, finalTime, bestComboRef.current, packRef.current, difficultyRef.current);
            }
            return updated;
          });
          isCheckingRef.current = false;
        }, 500);
      } else {
        if (!mutedRef.current) playSound('wrong');
        if (hapticsRef.current) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        comboRef.current = 0;
        setComboCount(0);
        const toUnflip = [...currentFlipped];
        setTimeout(() => {
          setCards(prev => prev.map(c => (toUnflip.includes(c.id) ? { ...c, flipped: false } : c)));
          isCheckingRef.current = false;
        }, 800);
      }
    } else {
      flippedRef.current = currentFlipped;
    }
  }, [moves, triggerWin]);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const matchedCount = cards.filter(c => c.matched).length / 2;
  const totalPairs = cards.length / 2;
  const key = scoreKey(pack, difficulty);
  const currentBest = scores[key] ?? null;
  const cardSize = CARD_SIZE_BY_DIFFICULTY[difficulty];
  const cardFontSize = difficulty === 'hard' ? 22 : 28;
  const diffColor = DIFFICULTY_COLORS[difficulty];

  const BannerAd = ads?.BannerAd ?? null;
  const BannerAdSize = ads?.BannerAdSize ?? null;

  return (
    <View style={[styles.container, { paddingTop: topInset + 6, paddingBottom: bottomInset + 4 }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>BRAINBOX</Text>
          <View style={styles.headerBtns}>
            <Pressable
              onPress={() => setLeaderboardVisible(true)}
              style={({ pressed }) => [styles.muteBtn, pressed && { opacity: 0.6 }]}>
              <Text style={styles.muteBtnText}>🏆</Text>
            </Pressable>
            <Pressable
              onPress={() => setSettingsVisible(true)}
              style={({ pressed }) => [styles.muteBtn, { marginLeft: 8 }, pressed && { opacity: 0.6 }]}>
              <Text style={styles.muteBtnText}>⚙</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatPill label="MOVES" value={String(moves)} color={C.accentCyan} />
          <StatPill label="TIME" value={formatTime(elapsedTime)} color={C.accentPurple} />
          <StatPill label="PAIRS" value={`${matchedCount}/${totalPairs}`} color={diffColor} />
          {currentBest !== null && (
            <StatPill label="BEST" value={String(currentBest.moves)} color={C.accentGold} />
          )}
        </View>
      </View>

      {/* ── Combo Banner ── */}
      {comboCount >= 2 ? (
        <Animated.View style={[styles.comboBanner, { transform: [{ scale: comboAnim }] }]}>
          <Text style={styles.comboText}>
            {comboCount >= 5 ? '🔥' : '⚡'}{' '}
            x{comboCount}{' '}
            {comboCount >= 5 ? 'UNSTOPPABLE!' : comboCount >= 3 ? 'ON FIRE!' : 'COMBO!'}
          </Text>
        </Animated.View>
      ) : (
        <View style={styles.comboBannerPlaceholder} />
      )}

      {/* ── Card Grid ── */}
      <View style={styles.grid}>
        {cards.map((card, i) => (
          <GameCard
            key={card.id}
            card={card}
            onPress={() => handleFlip(i)}
            cardSize={cardSize}
            fontSize={cardFontSize}
            difficultyColor={diffColor}
          />
        ))}
      </View>

      {/* ── Controls ── */}
      <View style={styles.bottomSection}>
        <SelectorRow
          label="DIFFICULTY"
          items={(['easy', 'medium', 'hard'] as Difficulty[]).map(d => ({
            key: d,
            label: DIFFICULTY_LABELS[d],
            active: d === difficulty,
            activeColor: DIFFICULTY_COLORS[d],
          }))}
          onPress={d => initGame(pack, d as Difficulty)}
        />

        <SelectorRow
          label="PACK"
          items={(Object.keys(PACKS) as Pack[]).map(p => ({
            key: p,
            label: PACK_LABELS[p],
            active: p === pack,
            activeColor: C.accentCyan,
          }))}
          onPress={p => initGame(p as Pack, difficulty)}
        />

        {adsAvailable && BannerAd && BannerAdSize && (
          <View style={styles.bannerContainer}>
            <BannerAd
              unitId={BANNER_AD_UNIT_ID}
              size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
              requestOptions={{ requestNonPersonalizedAdsOnly: false }}
            />
          </View>
        )}
      </View>

      {/* ── Win Overlay ── */}
      {gameWon && (
        <View style={styles.winOverlay}>
          <View style={styles.winCard}>
            <Text style={styles.winEmoji}>🎉</Text>
            <Text style={styles.winTitle}>LEVEL CLEAR!</Text>
            <View style={styles.winStats}>
              <WinStat icon="⚡" label="MOVES" value={String(moves)} />
              <WinStat icon="⏱" label="TIME" value={formatTime(elapsedTime)} />
              {finalCombo >= 2 && (
                <WinStat icon="🔥" label="COMBO" value={`x${finalCombo}`} />
              )}
            </View>
            {isNewBest && (
              <View style={styles.newBestBadge}>
                <Text style={styles.newBestText}>★ NEW RECORD!</Text>
              </View>
            )}
            {currentBest !== null && !isNewBest && (
              <Text style={styles.bestSub}>
                Best: {currentBest.moves} moves · {formatTime(currentBest.time)}
                {(currentBest.combo ?? 0) >= 2 ? ` · x${currentBest.combo} combo` : ''}
              </Text>
            )}
            <Pressable
              style={({ pressed }) => [styles.playAgainBtn, pressed && { opacity: 0.8 }]}
              onPress={() => initGame(pack, difficulty)}>
              <Text style={styles.playAgainText}>▶  PLAY AGAIN</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Leaderboard Modal ── */}
      <Modal
        visible={leaderboardVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLeaderboardVisible(false)}>
        <View style={styles.settingsOverlay}>
          <View style={[styles.settingsCard, { paddingBottom: 28 }]}>

            {/* Title row */}
            <View style={styles.settingsHeader}>
              <Text style={[styles.settingsTitle, { color: C.accentGold, textShadowColor: C.accentGold }]}>
                🏆  LEADERBOARD
              </Text>
              <Pressable
                onPress={() => setLeaderboardVisible(false)}
                style={({ pressed }) => [styles.settingsCloseBtn, pressed && { opacity: 0.6 }]}>
                <Text style={styles.settingsCloseTxt}>✕</Text>
              </Pressable>
            </View>

            {/* Column headers */}
            <View style={styles.lbColHeader}>
              <Text style={[styles.lbColLabel, { flex: 2 }]}>PACK / LEVEL</Text>
              <Text style={styles.lbColLabel}>MOVES</Text>
              <Text style={styles.lbColLabel}>TIME</Text>
              <Text style={styles.lbColLabel}>COMBO</Text>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {(['alphabet', 'doctor', 'animals', 'food'] as Pack[]).map(p => (
                <View key={p} style={styles.lbPackSection}>
                  <Text style={styles.lbPackName}>{PACK_LABELS[p]}</Text>
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => {
                    const key = `${p}_${d}`;
                    const best = scores[key] ?? null;
                    const diffC =
                      d === 'easy' ? C.accentGreen
                      : d === 'medium' ? C.accentCyan
                      : C.accentRed;
                    return (
                      <View key={d} style={styles.lbRow}>
                        <View style={[styles.lbDiffBadge, { borderColor: diffC }]}>
                          <Text style={[styles.lbDiffText, { color: diffC }]}>
                            {DIFFICULTY_LABELS[d]}
                          </Text>
                        </View>
                        <Text style={[styles.lbCell, !best && styles.lbCellDim]}>
                          {best ? String(best.moves) : '—'}
                        </Text>
                        <Text style={[styles.lbCell, !best && styles.lbCellDim]}>
                          {best ? formatTime(best.time) : '—'}
                        </Text>
                        <Text style={[styles.lbCell, !best && styles.lbCellDim]}>
                          {best && (best.combo ?? 0) >= 2 ? `x${best.combo}` : '—'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

          </View>
        </View>
      </Modal>

      {/* ── Settings Modal ── */}
      <Modal
        visible={settingsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsVisible(false)}>
        <View style={styles.settingsOverlay}>
          <View style={styles.settingsCard}>

            {/* Title row */}
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>⚙  SETTINGS</Text>
              <Pressable
                onPress={() => setSettingsVisible(false)}
                style={({ pressed }) => [styles.settingsCloseBtn, pressed && { opacity: 0.6 }]}>
                <Text style={styles.settingsCloseTxt}>✕</Text>
              </Pressable>
            </View>

            {/* Preferences */}
            <Text style={styles.settingsSectionLabel}>PREFERENCES</Text>
            <View style={styles.settingsPanel}>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsRowText}>🔊  Sound Effects</Text>
                <Switch
                  value={!muted}
                  onValueChange={toggleMute}
                  trackColor={{ false: '#2A2A2A', true: C.accentCyan + '66' }}
                  thumbColor={!muted ? C.accentCyan : '#555'}
                  ios_backgroundColor="#2A2A2A"
                />
              </View>
              <View style={styles.settingsDivider} />
              <View style={styles.settingsRow}>
                <Text style={styles.settingsRowText}>📳  Haptic Feedback</Text>
                <Switch
                  value={hapticsEnabled}
                  onValueChange={toggleHaptics}
                  trackColor={{ false: '#2A2A2A', true: C.accentPurple + '66' }}
                  thumbColor={hapticsEnabled ? C.accentPurple : '#555'}
                  ios_backgroundColor="#2A2A2A"
                />
              </View>
            </View>

            {/* Privacy */}
            <Text style={[styles.settingsSectionLabel, { marginTop: 20 }]}>PRIVACY</Text>
            <View style={styles.settingsPanel}>
              <Pressable
                style={({ pressed }) => [styles.settingsRow, pressed && { opacity: 0.65 }]}
                onPress={handleDeleteData}>
                <Text style={[styles.settingsRowText, { color: C.accentRed }]}>🗑  Delete My Data</Text>
              </Pressable>
            </View>
            <Text style={styles.settingsNote}>
              Removes all high scores and preferences stored on this device. Ad-related data (device identifiers, etc.) is managed by Google AdMob.{' '}
              <Text
                style={styles.settingsLink}
                onPress={() => Linking.openURL('https://myadcenter.google.com')}>
                Manage ad data →
              </Text>
            </Text>

          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.statPill, { borderColor: color + '55' }]}>
      <Text style={[styles.statLabel, { color: color }]}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function SelectorRow({
  label,
  items,
  onPress,
}: {
  label: string;
  items: { key: string; label: string; active: boolean; activeColor: string }[];
  onPress: (key: string) => void;
}) {
  return (
    <View style={styles.selectorGroup}>
      <Text style={styles.selectorLabel}>{label}</Text>
      <View style={styles.selectorRow}>
        {items.map(item => (
          <Pressable
            key={item.key}
            style={({ pressed }) => [
              styles.selectorBtn,
              item.active && { backgroundColor: item.activeColor + '22', borderColor: item.activeColor },
              pressed && { opacity: 0.65 },
            ]}
            onPress={() => onPress(item.key)}>
            <Text
              style={[
                styles.selectorBtnText,
                item.active && { color: item.activeColor },
              ]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function WinStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.winStat}>
      <Text style={styles.winStatIcon}>{icon}</Text>
      <Text style={styles.winStatLabel}>{label}</Text>
      <Text style={styles.winStatValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID_PADDING,
  },

  // Header
  header: { alignItems: 'center', gap: 10, width: '100%' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  muteBtn: {
    backgroundColor: C.panelBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.panelBorder,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteBtnText: {
    fontSize: 18,
  },
  title: {
    fontSize: 30,
    fontWeight: '900' as const,
    color: C.accentCyan,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 6,
    textShadowColor: C.accentCyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  statPill: {
    backgroundColor: C.panelBg,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 64,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: C.text,
    fontFamily: 'Inter_700Bold',
    marginTop: 1,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: CARD_GAP,
  },

  // Card faces
  cardBack: {
    backgroundColor: C.bgCard,
    borderWidth: 1.5,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  cardBackText: {
    fontWeight: '900' as const,
    fontFamily: 'Inter_700Bold',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  cardFront: {
    backgroundColor: C.bgFront,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  cardMatched: {
    backgroundColor: C.bgMatched,
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 10,
  },
  cardFrontText: { fontWeight: '700' as const },
  cornerDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },

  // Controls
  bottomSection: { alignItems: 'center', gap: 4, width: '100%' },
  selectorGroup: { alignItems: 'center', gap: 4, width: '100%' },
  selectorLabel: {
    fontSize: 9,
    color: C.textDim,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 2,
  },
  selectorRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  selectorBtn: {
    backgroundColor: C.panelBg,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.panelBorder,
  },
  selectorBtnText: {
    fontSize: 12,
    color: C.textMid,
    fontFamily: 'Inter_600SemiBold',
  },
  bannerContainer: { width: '100%', alignItems: 'center', marginTop: 4 },

  // Combo
  comboBanner: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.accentGold + '88',
    paddingHorizontal: 22,
    paddingVertical: 7,
    shadowColor: C.accentGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  comboBannerPlaceholder: {
    height: 34,
  },
  comboText: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: C.accentGold,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
    textShadowColor: C.accentGold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // Win overlay
  winOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winCard: {
    backgroundColor: '#0C1230',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: C.accentCyan + '66',
    padding: 32,
    alignItems: 'center',
    width: width * 0.82,
    gap: 10,
    shadowColor: C.accentCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  winEmoji: { fontSize: 52 },
  winTitle: {
    fontSize: 26,
    fontWeight: '900' as const,
    color: C.accentCyan,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 4,
    textShadowColor: C.accentCyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  winStats: { flexDirection: 'row', gap: 16, marginTop: 4 },
  winStat: {
    backgroundColor: C.panelBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.panelBorder,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  winStatIcon: { fontSize: 18 },
  winStatLabel: {
    fontSize: 9,
    color: C.textDim,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.5,
  },
  winStatValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: C.text,
    fontFamily: 'Inter_700Bold',
  },
  newBestBadge: {
    backgroundColor: C.accentGold,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: C.accentGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
  },
  newBestText: {
    fontSize: 13,
    fontWeight: '900' as const,
    color: '#1A0A00',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
  },
  bestSub: {
    fontSize: 12,
    color: C.textDim,
    fontFamily: 'Inter_400Regular',
  },
  playAgainBtn: {
    backgroundColor: C.accentCyan,
    paddingHorizontal: 34,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 6,
    shadowColor: C.accentCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 8,
  },
  playAgainText: {
    fontSize: 15,
    fontWeight: '900' as const,
    color: '#020A18',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
  },

  // Settings Modal
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  settingsCard: {
    backgroundColor: '#0C1230',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.accentCyan + '44',
    padding: 28,
    paddingBottom: 40,
    shadowColor: C.accentCyan,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: C.accentCyan,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 3,
    textShadowColor: C.accentCyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  settingsCloseBtn: {
    backgroundColor: C.panelBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.panelBorder,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsCloseTxt: {
    fontSize: 14,
    color: C.textMid,
    fontFamily: 'Inter_600SemiBold',
  },
  settingsSectionLabel: {
    fontSize: 10,
    color: C.textDim,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  settingsPanel: {
    backgroundColor: C.panelBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.panelBorder,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: C.panelBorder,
    marginHorizontal: 18,
  },
  settingsRowText: {
    fontSize: 15,
    color: C.text,
    fontFamily: 'Inter_600SemiBold',
  },
  settingsNote: {
    fontSize: 12,
    color: C.textDim,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    marginTop: 12,
  },
  settingsLink: {
    color: C.accentCyan,
    fontFamily: 'Inter_600SemiBold',
  },

  // Leaderboard
  headerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lbColHeader: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.panelBorder,
    marginBottom: 4,
  },
  lbColLabel: {
    flex: 1,
    fontSize: 9,
    color: C.textDim,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  lbPackSection: {
    marginTop: 14,
  },
  lbPackName: {
    fontSize: 11,
    color: C.accentGold,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
    marginBottom: 6,
    paddingLeft: 4,
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.panelBg,
    borderRadius: 10,
    marginBottom: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: C.panelBorder,
  },
  lbDiffBadge: {
    flex: 2,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginLeft: 2,
    alignSelf: 'flex-start',
    alignItems: 'center',
  },
  lbDiffText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  lbCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: C.text,
    fontFamily: 'Inter_600SemiBold',
  },
  lbCellDim: {
    color: C.textDim,
    fontSize: 12,
  },
});
