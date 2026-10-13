describe('Vocational Modular Assessment Logic (درس‌های پودمانی هنرستان)', () => {
  // Iranian vocational school formula:
  // continuousScore (0..5) + competencyScore (1..3) * 5 = finalScore (0..20)
  const calcPodmanFinalScore = (continuous: number, competency: number): number => {
    return continuous + competency * 5;
  };

  const isPodmanPassed = (finalScore: number): boolean => {
    return finalScore >= 12;
  };

  const calcLessonAnnualStatus = (podmans: Array<{ finalScore: number; isPassed: boolean }>) => {
    if (podmans.length !== 5) {
      return { status: 'INCOMPLETE', average: 0 };
    }
    const allPassed = podmans.every((p) => p.isPassed);
    if (!allPassed) {
      const failedNumbers = podmans
        .map((p, idx) => (!p.isPassed ? idx + 1 : null))
        .filter((n): n is number => n !== null);
      return {
        status: 'RETAKE_NEEDED',
        failedPodmans: failedNumbers,
        average: 0,
      };
    }
    const sum = podmans.reduce((acc, cur) => acc + cur.finalScore, 0);
    return {
      status: 'PASSED',
      failedPodmans: [],
      average: parseFloat((sum / 5).toFixed(2)),
    };
  };

  it('calculates podman final score correctly according to national vocational formula', () => {
    // Competency Level 1 (عدم احراز) -> 1 * 5 = 5
    expect(calcPodmanFinalScore(4.5, 1)).toBe(9.5);
    expect(isPodmanPassed(9.5)).toBe(false); // < 12 => fails!

    // Competency Level 2 (حد انتظار) -> 2 * 5 = 10
    expect(calcPodmanFinalScore(2.0, 2)).toBe(12.0);
    expect(isPodmanPassed(12.0)).toBe(true); // >= 12 => passes!

    expect(calcPodmanFinalScore(1.5, 2)).toBe(11.5);
    expect(isPodmanPassed(11.5)).toBe(false); // < 12 => fails!

    // Competency Level 3 (بالاتر از حد انتظار) -> 3 * 5 = 15
    expect(calcPodmanFinalScore(5.0, 3)).toBe(20.0);
    expect(isPodmanPassed(20.0)).toBe(true);

    expect(calcPodmanFinalScore(4.0, 3)).toBe(19.0);
    expect(isPodmanPassed(19.0)).toBe(true);
  });

  it('fails the entire lesson if even one podman is below 12', () => {
    const studentPodmans = [
      { finalScore: 19.5, isPassed: true },
      { finalScore: 14.0, isPassed: true },
      { finalScore: 11.5, isPassed: false }, // Podman 3 failed!
      { finalScore: 18.0, isPassed: true },
      { finalScore: 16.0, isPassed: true },
    ];

    const result = calcLessonAnnualStatus(studentPodmans);
    expect(result.status).toBe('RETAKE_NEEDED');
    expect(result.failedPodmans).toEqual([3]);
    expect(result.average).toBe(0); // Cannot average when incomplete
  });

  it('passes the lesson and calculates annual average when all 5 podmans are passed (>= 12)', () => {
    const studentPodmans = [
      { finalScore: 19.5, isPassed: true },
      { finalScore: 14.0, isPassed: true },
      { finalScore: 17.5, isPassed: true },
      { finalScore: 15.0, isPassed: true },
      { finalScore: 18.0, isPassed: true },
    ];

    const result = calcLessonAnnualStatus(studentPodmans);
    expect(result.status).toBe('PASSED');
    expect(result.failedPodmans).toEqual([]);
    // (19.5 + 14.0 + 17.5 + 15.0 + 18.0) / 5 = 84 / 5 = 16.8
    expect(result.average).toBe(16.8);
  });
});
