/**
 * Sound Effects Generator using Web Audio API
 * 게임 효과음을 프로그래밍 방식으로 생성합니다
 */

class SoundEffectsManager {
  private audioContext: AudioContext | null = null;
  private masterVolume: number = 0.1; // 기본 볼륨 10%
  private enabled: boolean = true;

  constructor() {
    // AudioContext는 사용자 인터랙션 후에 생성
    if (typeof window !== 'undefined') {
      this.initAudioContext();
    }
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  private ensureAudioContext() {
    if (!this.audioContext) {
      this.initAudioContext();
    }

    // Resume context if suspended (브라우저 autoplay 정책 대응)
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * 기본 톤 생성
   */
  private createOscillator(
    frequency: number,
    type: OscillatorType = 'sine'
  ): OscillatorNode | null {
    if (!this.audioContext || !this.enabled) return null;
    this.ensureAudioContext();

    const oscillator = this.audioContext.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    return oscillator;
  }

  /**
   * 게인(볼륨) 노드 생성
   */
  private createGain(
    initialValue: number = 0,
    attackTime: number = 0.01,
    decayTime: number = 0.1,
    sustainValue: number = 0.3,
    releaseTime: number = 0.1
  ): GainNode | null {
    if (!this.audioContext) return null;

    const gainNode = this.audioContext.createGain();
    const now = this.audioContext.currentTime;

    // ADSR 엔벨로프
    gainNode.gain.setValueAtTime(initialValue, now);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume, now + attackTime);
    gainNode.gain.linearRampToValueAtTime(sustainValue * this.masterVolume, now + attackTime + decayTime);
    gainNode.gain.linearRampToValueAtTime(0, now + attackTime + decayTime + releaseTime);

    return gainNode;
  }

  /**
   * 뽑기 성공 효과음 (반짝이는 소리)
   */
  playGachaSuccess(tier: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'ICON' = 'COMMON') {
    if (!this.audioContext || !this.enabled) return;
    this.ensureAudioContext();

    const now = this.audioContext.currentTime;

    // 티어별 다른 음정
    const frequencies = {
      COMMON: [523, 659, 784], // C5, E5, G5
      RARE: [659, 784, 988], // E5, G5, B5
      EPIC: [784, 988, 1175], // G5, B5, D6
      LEGENDARY: [988, 1175, 1397, 1568], // B5, D6, F6, G6
      ICON: [1175, 1397, 1568, 1760, 2093], // D6, F6, G6, A6, C7
    };

    const notes = frequencies[tier];
    const interval = 0.08;

    notes.forEach((freq, index) => {
      const osc = this.createOscillator(freq, 'sine');
      const gain = this.audioContext!.createGain();

      if (!osc) return;

      const startTime = now + (index * interval);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.5, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

      osc.connect(gain);
      gain.connect(this.audioContext!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }

  /**
   * 버튼 클릭 효과음
   */
  playClick() {
    if (!this.audioContext || !this.enabled) return;
    this.ensureAudioContext();

    const osc = this.createOscillator(800, 'square');
    const gain = this.createGain(0, 0.01, 0.05, 0.1, 0.05);

    if (!osc || !gain) return;

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start(this.audioContext.currentTime);
    osc.stop(this.audioContext.currentTime + 0.1);
  }

  /**
   * 성공 효과음 (레벨업, 미션 완료 등)
   */
  playSuccess() {
    if (!this.audioContext || !this.enabled) return;
    this.ensureAudioContext();

    const now = this.audioContext.currentTime;

    // 상승하는 3음
    [523, 659, 784].forEach((freq, index) => {
      const osc = this.createOscillator(freq, 'triangle');
      const gain = this.audioContext!.createGain();

      if (!osc) return;

      const startTime = now + (index * 0.1);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.4, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      osc.connect(gain);
      gain.connect(this.audioContext!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  }

  /**
   * 실패 효과음
   */
  playError() {
    if (!this.audioContext || !this.enabled) return;
    this.ensureAudioContext();

    const now = this.audioContext.currentTime;

    // 하강하는 불협화음
    [400, 350, 300].forEach((freq, index) => {
      const osc = this.createOscillator(freq, 'sawtooth');
      const gain = this.audioContext!.createGain();

      if (!osc) return;

      const startTime = now + (index * 0.08);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.3, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

      osc.connect(gain);
      gain.connect(this.audioContext!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }

  /**
   * 알림 효과음 (채팅 메시지, 거래 요청 등)
   */
  playNotification() {
    if (!this.audioContext || !this.enabled) return;
    this.ensureAudioContext();

    const now = this.audioContext.currentTime;

    [880, 1047].forEach((freq, index) => {
      const osc = this.createOscillator(freq, 'sine');
      const gain = this.audioContext!.createGain();

      if (!osc) return;

      const startTime = now + (index * 0.05);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.3, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);

      osc.connect(gain);
      gain.connect(this.audioContext!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.1);
    });
  }

  /**
   * 경고 효과음
   */
  playWarning() {
    if (!this.audioContext || !this.enabled) return;
    this.ensureAudioContext();

    const now = this.audioContext.currentTime;
    const osc = this.createOscillator(440, 'square');
    const gain = this.audioContext.createGain();

    if (!osc) return;

    // 경고음 패턴
    for (let i = 0; i < 3; i++) {
      const startTime = now + (i * 0.2);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.4, startTime + 0.01);
      gain.gain.linearRampToValueAtTime(0, startTime + 0.08);
    }

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  /**
   * 승리 효과음 (경기 승리)
   */
  playVictory() {
    if (!this.audioContext || !this.enabled) return;
    this.ensureAudioContext();

    const now = this.audioContext.currentTime;

    // 팡파레 멜로디
    const melody = [
      { freq: 523, time: 0 },    // C5
      { freq: 523, time: 0.15 },  // C5
      { freq: 523, time: 0.3 },   // C5
      { freq: 659, time: 0.45 },  // E5
      { freq: 784, time: 0.6 },   // G5
      { freq: 1047, time: 0.75 }, // C6
    ];

    melody.forEach(note => {
      const osc = this.createOscillator(note.freq, 'triangle');
      const gain = this.audioContext!.createGain();

      if (!osc) return;

      const startTime = now + note.time;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.5, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

      osc.connect(gain);
      gain.connect(this.audioContext!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }

  /**
   * 패배 효과음 (경기 패배)
   */
  playDefeat() {
    if (!this.audioContext || !this.enabled) return;
    this.ensureAudioContext();

    const now = this.audioContext.currentTime;

    // 하강하는 멜로디
    const melody = [
      { freq: 523, time: 0 },
      { freq: 466, time: 0.15 },
      { freq: 392, time: 0.3 },
      { freq: 330, time: 0.45 },
    ];

    melody.forEach(note => {
      const osc = this.createOscillator(note.freq, 'sawtooth');
      const gain = this.audioContext!.createGain();

      if (!osc) return;

      const startTime = now + note.time;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.4, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);

      osc.connect(gain);
      gain.connect(this.audioContext!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  }

  /**
   * 포인트 획득 효과음
   */
  playPointsEarned() {
    if (!this.audioContext || !this.enabled) return;
    this.ensureAudioContext();

    const now = this.audioContext.currentTime;

    // 반짝이는 소리
    [1047, 1319, 1568].forEach((freq, index) => {
      const osc = this.createOscillator(freq, 'sine');
      const gain = this.audioContext!.createGain();

      if (!osc) return;

      const startTime = now + (index * 0.05);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.3, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      osc.connect(gain);
      gain.connect(this.audioContext!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  }

  /**
   * 카드 강화 성공 효과음
   */
  playEnhancementSuccess() {
    if (!this.audioContext || !this.enabled) return;
    this.ensureAudioContext();

    const now = this.audioContext.currentTime;

    // 파워업 사운드
    const osc1 = this.createOscillator(200, 'sawtooth');
    const gain1 = this.audioContext.createGain();

    if (osc1) {
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(this.masterVolume * 0.4, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc1.frequency.exponentialRampToValueAtTime(800, now + 0.3);

      osc1.connect(gain1);
      gain1.connect(this.audioContext.destination);

      osc1.start(now);
      osc1.stop(now + 0.3);
    }
  }

  /**
   * 카드 강화 실패 효과음
   */
  playEnhancementFail() {
    if (!this.audioContext || !this.enabled) return;
    this.ensureAudioContext();

    const now = this.audioContext.currentTime;

    // 파괴 사운드
    const osc1 = this.createOscillator(600, 'sawtooth');
    const gain1 = this.audioContext.createGain();

    if (osc1) {
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(this.masterVolume * 0.5, now + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc1.frequency.exponentialRampToValueAtTime(100, now + 0.4);

      osc1.connect(gain1);
      gain1.connect(this.audioContext.destination);

      osc1.start(now);
      osc1.stop(now + 0.4);
    }
  }

  /**
   * 사운드 켜기/끄기
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('soundEnabled', enabled ? 'true' : 'false');
  }

  /**
   * 사운드 활성화 여부 확인
   */
  isEnabled(): boolean {
    const saved = localStorage.getItem('soundEnabled');
    if (saved !== null) {
      this.enabled = saved === 'true';
    }
    return this.enabled;
  }

  /**
   * 마스터 볼륨 설정 (0.0 ~ 1.0)
   */
  setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('soundVolume', this.masterVolume.toString());
  }

  /**
   * 현재 볼륨 가져오기
   */
  getVolume(): number {
    const saved = localStorage.getItem('soundVolume');
    if (saved !== null) {
      this.masterVolume = parseFloat(saved);
    }
    return this.masterVolume;
  }
}

// 싱글톤 인스턴스
export const soundEffects = new SoundEffectsManager();

// 헬퍼 함수: 티어에 맞는 뽑기 효과음 재생
export function playSound(tier: string) {
  const tierMap: { [key: string]: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'ICON' } = {
    'COMMON': 'COMMON',
    'RARE': 'RARE',
    'EPIC': 'EPIC',
    'LEGENDARY': 'LEGENDARY',
    'ICON': 'ICON',
  };

  const mappedTier = tierMap[tier.toUpperCase()] || 'COMMON';
  soundEffects.playGachaSuccess(mappedTier);
}
