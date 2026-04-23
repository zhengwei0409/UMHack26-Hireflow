import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

const DEFAULT_LANGUAGE = 'python';
const INTERVIEW_TIME_LIMIT_SECONDS = 15 * 60;

const fieldClassName =
  'w-full rounded-md border border-zinc-200 bg-white px-3.5 py-3 text-sm font-medium text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-black focus:ring-2 focus:ring-black/10';

const languageMeta = {
  python: { label: 'Python', extension: 'py' },
  javascript: { label: 'JavaScript', extension: 'js' },
  cpp: { label: 'C++', extension: 'cpp' },
  java: { label: 'Java', extension: 'java' },
};

const getRecorderMimeType = () => {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return '';
  }

  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return candidates.find((item) => MediaRecorder.isTypeSupported(item)) || '';
};

const stopStreamTracks = (stream) => {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
};

const formatTimeRemaining = (seconds) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};

const getDefaultCameraPosition = () => {
  if (typeof window === 'undefined') {
    return { x: 16, y: 96 };
  }

  const isLargeScreen = window.innerWidth >= 1024;
  const panelWidth = isLargeScreen ? 310 : window.innerWidth >= 640 ? 250 : 210;
  const rightOffset = isLargeScreen ? 24 : 16;
  const bottomOffset = isLargeScreen ? 24 : 80;

  return {
    x: Math.max(16, window.innerWidth - panelWidth - rightOffset),
    y: Math.max(16, window.innerHeight - 220 - bottomOffset),
  };
};

const InterviewRoom = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [mediaReady, setMediaReady] = useState(false);
  const [mediaRequesting, setMediaRequesting] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [violationCount, setViolationCount] = useState(0);
  const [warning, setWarning] = useState(null);
  const [terminated, setTerminated] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(INTERVIEW_TIME_LIMIT_SECONDS);
  const [cameraWidgetPosition, setCameraWidgetPosition] = useState(() => getDefaultCameraPosition());
  const [isDraggingCamera, setIsDraggingCamera] = useState(false);
  const [saveStates, setSaveStates] = useState({});
  const endingRef = useRef(false);
  const mediaInitRef = useRef(false);
  const mediaAutoRequestedRef = useRef(false);
  const cameraPreviewRef = useRef(null);
  const cameraWidgetRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const combinedRecorderRef = useRef(null);
  const combinedStreamRef = useRef(null);
  const combinedChunksRef = useRef([]);
  const violationCountRef = useRef(0);
  const dragStateRef = useRef(null);
  const autoSaveTimersRef = useRef({});
  const timerStartedAtRef = useRef(null);
  const timeExpiredRef = useRef(false);

  const loadSession = async () => {
    try {
      const res = await api.interviews.get(token);
      if (res.data?.attemptLocked) {
        navigate(`/interview/${token}/complete`, {
          replace: true,
          state: res.data,
        });
        return;
      }

      setSession(res.data);
      const nextDrafts = {};
      const nextSaveStates = {};
      (res.data.questions || []).forEach((question) => {
        nextDrafts[question.id] = {
          rawAnswer: question.answer?.rawAnswer || '',
          selectedOption: question.answer?.selectedOption || '',
          codeSubmission: question.answer?.codeSubmission || '',
          programmingLanguage: question.answer?.programmingLanguage || DEFAULT_LANGUAGE,
        };
        nextSaveStates[question.id] = question.answer
          ? 'saved'
          : 'idle';
      });
      setDrafts(nextDrafts);
      setSaveStates(nextSaveStates);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [token]);

  useEffect(() => {
    return () => {
      Object.values(autoSaveTimersRef.current).forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const cleanupMedia = () => {
    stopStreamTracks(cameraStreamRef.current);
    stopStreamTracks(screenStreamRef.current);
    stopStreamTracks(combinedStreamRef.current);
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    combinedStreamRef.current = null;
    combinedRecorderRef.current = null;
    if (cameraPreviewRef.current) {
      cameraPreviewRef.current.srcObject = null;
    }
  };

  const stopRecorder = (recorder) =>
    new Promise((resolve) => {
      if (!recorder || recorder.state === 'inactive') {
        resolve();
        return;
      }

      recorder.addEventListener('stop', () => resolve(), { once: true });
      recorder.stop();
    });

  const finalizeRecordings = async () => {
    await stopRecorder(combinedRecorderRef.current);

    const mimeType = getRecorderMimeType() || 'video/webm';
    const screenBlob = combinedChunksRef.current.length ? new Blob(combinedChunksRef.current, { type: mimeType }) : null;

    cleanupMedia();

    return { screenBlob };
  };

  const uploadRecordings = async (reason) => {
    const { screenBlob } = await finalizeRecordings();

    if (!screenBlob) {
      return null;
    }

    const formData = new FormData();
    if (screenBlob && screenBlob.size > 0) {
      formData.append('screenRecording', screenBlob, 'screen-with-camera.webm');
    }

    formData.append(
      'metadata',
      JSON.stringify({
        reason,
        violationCount: violationCountRef.current,
        recordingType: 'screen_capture_with_visible_camera_widget',
      }),
    );

    return api.interviews.uploadRecordings(token, formData);
  };

  const completeInterview = async ({ reason = null, wasTerminated = false } = {}) => {
    if (endingRef.current) return;

    endingRef.current = true;
    setSubmitting(true);
    setTerminated(wasTerminated);
    setWarning(null);
    setError('');

    try {
      await uploadRecordings(reason);
      const res = await api.interviews.submit(token);
      navigate(`/interview/${token}/complete`, {
        state: {
          ...res.data,
          terminationReason: reason,
          violationCount: violationCountRef.current,
          wasTerminated,
        },
      });
    } catch (err) {
      endingRef.current = false;
      setSubmitting(false);
      setTerminated(false);
      setError(err.message);
    }
  };

  const endInterview = async (reason) => {
    await completeInterview({ reason, wasTerminated: true });
  };

  const handleViolation = async ({ reason, message }) => {
    if (endingRef.current) return;

    const nextViolationCount = violationCountRef.current + 1;
    violationCountRef.current = nextViolationCount;
    setViolationCount(nextViolationCount);

    if (nextViolationCount === 1) {
      setWarning({
        title: 'Warning issued',
        message,
      });
      return;
    }

    await endInterview(reason);
  };

  const requestMediaAccess = async () => {
    if (loading || !session?.id || mediaInitRef.current || mediaRequesting) {
      return;
    }

    mediaInitRef.current = true;
    setMediaRequesting(true);
    setMediaError('');

    try {
      if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('This browser does not support camera and screen recording.');
      }

      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
          facingMode: 'user',
        },
        audio: true,
      });

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 15, max: 30 },
        },
        audio: true,
      });

      cameraStreamRef.current = cameraStream;
      screenStreamRef.current = screenStream;

      if (cameraPreviewRef.current) {
        cameraPreviewRef.current.srcObject = cameraStream;
      }

      const mimeType = getRecorderMimeType();
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('This browser does not support recording.');
      }

      combinedChunksRef.current = [];
      const screenVideoTracks = screenStream.getVideoTracks();
      if (!screenVideoTracks.length) {
        throw new Error('Screen recording could not start.');
      }

      const combinedStream = new MediaStream([
        ...screenVideoTracks,
        ...screenStream.getAudioTracks(),
        ...cameraStream.getAudioTracks(),
      ]);

      const combinedRecorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : undefined);

      combinedRecorder.addEventListener('dataavailable', (event) => {
        if (event.data && event.data.size > 0) {
          combinedChunksRef.current.push(event.data);
        }
      });

      const handleScreenShareEnded = () => {
        handleViolation({
          reason: 'SCREEN_SHARE_STOPPED',
          message: 'Screen sharing must stay on during the interview. One more integrity violation will end the interview.',
        });
      };

      screenStream.getVideoTracks().forEach((track) => {
        track.addEventListener('ended', handleScreenShareEnded, { once: true });
      });

      combinedRecorder.start(1000);
      combinedStreamRef.current = combinedStream;
      combinedRecorderRef.current = combinedRecorder;
      setMediaReady(true);
    } catch (err) {
      cleanupMedia();
      mediaInitRef.current = false;
      const permissionDenied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
      const fallbackMessage = permissionDenied
        ? 'Camera or screen sharing was denied. Please click the button below, then approve camera and choose a screen/window to continue.'
        : 'Camera and screen access are required to continue.';
      setMediaError(permissionDenied ? fallbackMessage : err.message || fallbackMessage);
      api.interviews.logProctorEvents(token, [
        {
          type: permissionDenied ? 'SCREEN_SHARE_DENIED' : 'MEDIA_SETUP_FAILED',
          severity: permissionDenied ? 1 : 2,
          occurredAt: new Date().toISOString(),
          metadata: {
            errorName: err?.name,
            errorMessage: err?.message,
          },
        },
      ]).catch(() => null);
    } finally {
      setMediaRequesting(false);
    }
  };

  useEffect(() => {
    if (loading || !session?.id || mediaAutoRequestedRef.current) {
      return;
    }

    mediaAutoRequestedRef.current = true;
    requestMediaAccess();
  }, [loading, session?.id]);

  useEffect(() => {
    if (mediaReady && cameraPreviewRef.current && cameraStreamRef.current) {
      cameraPreviewRef.current.srcObject = cameraStreamRef.current;
    }
  }, [mediaReady]);

  useEffect(() => () => {
    cleanupMedia();
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        handleViolation({
          reason: 'TAB_SWITCH_LIMIT_EXCEEDED',
          message: 'Leaving the interview tab is not allowed. One more integrity violation will end the interview.',
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setCameraWidgetPosition((current) => {
        const panel = cameraWidgetRef.current;
        const panelWidth = panel?.offsetWidth || 260;
        const panelHeight = panel?.offsetHeight || 220;

        return {
          x: Math.min(Math.max(16, current.x), Math.max(16, window.innerWidth - panelWidth - 16)),
          y: Math.min(Math.max(16, current.y), Math.max(16, window.innerHeight - panelHeight - 16)),
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!dragStateRef.current) return;

      const panel = cameraWidgetRef.current;
      if (!panel) return;

      const panelWidth = panel.offsetWidth;
      const panelHeight = panel.offsetHeight;
      const nextX = event.clientX - dragStateRef.current.offsetX;
      const nextY = event.clientY - dragStateRef.current.offsetY;

      setCameraWidgetPosition({
        x: Math.min(Math.max(16, nextX), Math.max(16, window.innerWidth - panelWidth - 16)),
        y: Math.min(Math.max(16, nextY), Math.max(16, window.innerHeight - panelHeight - 16)),
      });
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
      setIsDraggingCamera(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const handleCameraWidgetPointerDown = (event) => {
    if (event.button !== 0) return;

    const panel = cameraWidgetRef.current;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    dragStateRef.current = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    setIsDraggingCamera(true);
  };

  const updateDraft = (questionId, patch) => {
    setDrafts((current) => ({
      ...current,
      [questionId]: {
        ...current[questionId],
        ...patch,
      },
    }));
  };

  const updateQuestionAnswerSnapshot = (questionId, payload) => {
    setSession((current) => {
      if (!current) return current;

      return {
        ...current,
        questions: (current.questions || []).map((question) =>
          question.id === questionId
            ? {
                ...question,
                answer: {
                  ...question.answer,
                  ...payload,
                },
              }
            : question,
        ),
      };
    });
  };

  const handleSaveAnswer = async (question, draftOverride = null) => {
    setError('');
    setSaveStates((current) => ({
      ...current,
      [question.id]: 'saving',
    }));

    try {
      const draft = draftOverride || drafts[question.id] || {};
      const payload = {
        questionId: question.id,
        rawAnswer: question.type === 'BEHAVIORAL' ? draft.rawAnswer : undefined,
        selectedOption: question.type === 'MCQ' ? draft.selectedOption : undefined,
        codeSubmission: question.type === 'DSA' ? draft.codeSubmission : undefined,
        programmingLanguage: question.type === 'DSA' ? draft.programmingLanguage : undefined,
      };

      await api.interviews.saveAnswer(token, payload);
      updateQuestionAnswerSnapshot(question.id, payload);
      setSaveStates((current) => ({
        ...current,
        [question.id]: 'saved',
      }));
    } catch (err) {
      setSaveStates((current) => ({
        ...current,
        [question.id]: 'error',
      }));
      setError(err.message);
    }
  };

  const scheduleAutoSave = (question, nextDraft) => {
    if (autoSaveTimersRef.current[question.id]) {
      window.clearTimeout(autoSaveTimersRef.current[question.id]);
    }

    setSaveStates((current) => ({
      ...current,
      [question.id]: 'pending',
    }));

    autoSaveTimersRef.current[question.id] = window.setTimeout(async () => {
      const hasAnswer =
        Boolean(nextDraft.rawAnswer?.trim()) ||
        Boolean(nextDraft.selectedOption) ||
        Boolean(nextDraft.codeSubmission?.trim());

      if (!hasAnswer) {
        setSaveStates((current) => ({
          ...current,
          [question.id]: 'idle',
        }));
        return;
      }

      await handleSaveAnswer(question);
    }, 800);
  };

  const flushDraftAnswers = async () => {
    const questions = session?.questions || [];
    await Promise.all(
      questions
        .filter((question) => questionHasAnswer(question))
        .map((question) => {
          const timer = autoSaveTimersRef.current[question.id];
          if (timer) {
            window.clearTimeout(timer);
            delete autoSaveTimersRef.current[question.id];
          }

          return handleSaveAnswer(question);
        }),
    );
  };

  const handleSubmit = async () => {
    await flushDraftAnswers();
    await completeInterview();
  };

  const handlePasteAttempt = async () => {
    await handleViolation({
      reason: 'PASTE_LIMIT_EXCEEDED',
      message: 'Copy and paste is not allowed in this interview. One more integrity violation will end the interview.',
    });
  };

  const getLineNumbers = (value) => {
    const lineCount = Math.max((value || '').split('\n').length, 14);
    return Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');
  };

  const handleCodeEditorKeyDown = (event, question, draft) => {
    if (event.key !== 'Tab') return;

    event.preventDefault();
    const { selectionStart, selectionEnd, value } = event.currentTarget;
    const nextValue = `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`;
    const nextCursorPosition = selectionStart + 2;
    const nextDraft = { ...draft, codeSubmission: nextValue };

    updateDraft(question.id, { codeSubmission: nextValue });
    scheduleAutoSave(question, nextDraft);

    window.requestAnimationFrame(() => {
      event.currentTarget.selectionStart = nextCursorPosition;
      event.currentTarget.selectionEnd = nextCursorPosition;
    });
  };

  const questionHasAnswer = (question) => {
    const draft = drafts[question.id] || {};
    return Boolean(draft.rawAnswer?.trim() || draft.selectedOption || draft.codeSubmission?.trim());
  };

  useEffect(() => {
    if (!mediaReady || endingRef.current) {
      return undefined;
    }

    if (!timerStartedAtRef.current) {
      timerStartedAtRef.current = Date.now();
    }

    const tick = () => {
      const elapsedSeconds = Math.floor((Date.now() - timerStartedAtRef.current) / 1000);
      const nextTimeRemaining = Math.max(0, INTERVIEW_TIME_LIMIT_SECONDS - elapsedSeconds);
      setTimeRemaining(nextTimeRemaining);

      if (nextTimeRemaining === 0 && !endingRef.current && !timeExpiredRef.current) {
        timeExpiredRef.current = true;
        flushDraftAnswers()
          .catch(() => null)
          .finally(() => completeInterview({ reason: 'TIME_LIMIT_REACHED' }));
      }
    };

    tick();
    const timerId = window.setInterval(tick, 1000);
    return () => window.clearInterval(timerId);
  }, [mediaReady, drafts, session?.questions]);

  const completedAnswers = useMemo(
    () =>
      (session?.questions || []).filter((question) => questionHasAnswer(question)).length,
    [drafts, session?.questions],
  );

  const getAnswerStatus = (questionId, draft) => {
    const saveState = saveStates[questionId] || 'idle';
    const hasAnswer = Boolean(draft?.rawAnswer?.trim() || draft?.selectedOption || draft?.codeSubmission?.trim());

    if (saveState === 'saving') {
      return {
        label: 'Saving...',
        className: 'border-zinc-300 bg-zinc-100 text-zinc-700',
      };
    }

    if (saveState === 'pending') {
      return {
        label: 'Saving...',
        className: 'border-zinc-200 bg-zinc-50 text-zinc-600',
      };
    }

    if (saveState === 'error') {
      return {
        label: 'Save failed',
        className: 'border-red-200 bg-red-50 text-red-600',
      };
    }

    if (hasAnswer || saveState === 'saved') {
      return {
        label: 'Saved',
        className: 'border-zinc-200 bg-zinc-50 text-zinc-700',
      };
    }

    return {
      label: 'Not answered',
      className: 'border-zinc-200 bg-white text-zinc-500',
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-md border border-zinc-200 bg-white px-6 py-12 text-center text-sm font-semibold text-zinc-500">
          Loading interview room...
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      </div>
    );
  }

  const metrics = [
    { label: 'Questions', value: session?.questions?.length || 0 },
    { label: 'Saved answers', value: completedAnswers },
    {
      label: 'Time left',
      value: formatTimeRemaining(timeRemaining),
      urgent: mediaReady && timeRemaining <= 60,
    },
    { label: 'Monitoring', value: mediaReady ? 'Camera + Screen On' : 'Waiting' },
  ];
  const mediaLocked = !mediaReady;
  const totalQuestions = session?.questions?.length || 0;
  const allQuestionsAnswered = totalQuestions > 0 && completedAnswers === totalQuestions;
  const submitDisabled = submitting || terminated || !mediaReady || Boolean(mediaError) || !allQuestionsAnswered;

  return (
    <div className="min-h-screen bg-[#f5f5f5] px-4 py-4 text-black sm:px-6 lg:px-8">
      <div
        className={`mx-auto flex max-w-7xl flex-col gap-6 pb-44 transition duration-300 lg:pb-12 ${
          mediaLocked ? 'pointer-events-none select-none opacity-60 blur-xl' : ''
        }`}
        aria-hidden={mediaLocked}
      >
        <section className="interview-room-hero overflow-hidden rounded-md border border-zinc-200 bg-white shadow-sm">
          <div className="grid gap-6 px-6 py-6 lg:px-8 lg:py-8">
            <div className="interview-reveal max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-zinc-500">Interview in progress</p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl">
                {session?.candidate?.jobTitle} interview
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-zinc-600 sm:text-base">
                Camera and screen recording must stay active during the full interview. Save answers as you go, then
                submit once you are fully done.
              </p>
            </div>

          </div>

          <div className="grid gap-px border-t border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric, index) => (
              <div
                key={metric.label}
                className={`interview-reveal px-6 py-4 ${metric.urgent ? 'bg-red-50' : 'bg-zinc-50'}`}
                style={{ animationDelay: `${120 + index * 55}ms` }}
              >
                <p className={`text-xs font-extrabold uppercase tracking-[0.18em] ${metric.urgent ? 'text-red-500' : 'text-zinc-500'}`}>{metric.label}</p>
                <p className={`mt-2 text-2xl font-extrabold tracking-tight ${metric.urgent ? 'text-red-700' : 'text-zinc-950'}`}>{metric.value}</p>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4">
          {(session?.questions || []).map((question, index) => {
            const draft = drafts[question.id] || {};
            const answerStatus = getAnswerStatus(question.id, draft);
            const selectedLanguage = draft.programmingLanguage || DEFAULT_LANGUAGE;
            const editorMeta = languageMeta[selectedLanguage] || languageMeta[DEFAULT_LANGUAGE];
            const lineNumbers = getLineNumbers(draft.codeSubmission);

            return (
              <article
                key={question.id}
                className="interview-question-card rounded-md border border-zinc-200 bg-white p-6 shadow-sm lg:p-8"
                style={{ animationDelay: `${180 + Math.min(index, 6) * 70}ms` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-4xl">
                    <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-500">
                      {question.type} · Question {question.sequence}
                    </div>
                    <h2 className="mt-4 text-xl font-extrabold tracking-tight text-zinc-950">{question.prompt}</h2>
                  </div>

                  <div
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] ${answerStatus.className}`}
                  >
                    {answerStatus.label}
                  </div>
                </div>

                {question.type === 'MCQ' && (
                  <div className="mt-6 grid gap-3">
                    {(question.choices || []).map((choice) => (
                      <label
                        key={choice}
                        className={`flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 text-sm font-semibold transition ${
                          draft.selectedOption === choice
                            ? 'border-black bg-zinc-100 text-zinc-950'
                            : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          className="mt-1 h-4 w-4 accent-black"
                          checked={draft.selectedOption === choice}
                          onChange={async () => {
                            const nextDraft = { ...draft, selectedOption: choice };
                            updateDraft(question.id, { selectedOption: choice });
                            await handleSaveAnswer(question, nextDraft);
                          }}
                        />
                        <span>{choice}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'BEHAVIORAL' && (
                  <textarea
                    rows={7}
                    className={`${fieldClassName} mt-6 min-h-[180px]`}
                    value={draft.rawAnswer}
                    onChange={(e) => {
                      const nextDraft = { ...draft, rawAnswer: e.target.value };
                      updateDraft(question.id, { rawAnswer: e.target.value });
                      scheduleAutoSave(question, nextDraft);
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      handlePasteAttempt();
                    }}
                    placeholder="Write your answer here..."
                  />
                )}

                {question.type === 'DSA' && (
                  <div className="mt-6 grid gap-4">
                    <div className="code-editor-shell overflow-hidden rounded-2xl border border-zinc-900/80 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
                      <div className="code-editor-topbar">
                        <div className="code-editor-tab">
                          <span>{`solution.${editorMeta.extension}`}</span>
                        </div>

                        <label className="code-editor-language">
                          <span className="sr-only">Language</span>
                          <select
                            value={selectedLanguage}
                            onChange={(e) => {
                              const nextDraft = { ...draft, programmingLanguage: e.target.value };
                              updateDraft(question.id, { programmingLanguage: e.target.value });
                              scheduleAutoSave(question, nextDraft);
                            }}
                          >
                            <option value="python">Python</option>
                            <option value="javascript">JavaScript</option>
                            <option value="cpp">C++</option>
                            <option value="java">Java</option>
                          </select>
                        </label>
                      </div>

                      <div className="code-editor-body">
                        <pre className="code-editor-lines" aria-hidden="true">
                          {lineNumbers}
                        </pre>

                        <textarea
                          rows={14}
                          spellCheck={false}
                          className="code-editor-textarea"
                          value={draft.codeSubmission}
                          onChange={(e) => {
                            const nextDraft = { ...draft, codeSubmission: e.target.value };
                            updateDraft(question.id, { codeSubmission: e.target.value });
                            scheduleAutoSave(question, nextDraft);
                          }}
                          onKeyDown={(e) => handleCodeEditorKeyDown(e, question, draft)}
                          onPaste={(e) => {
                            e.preventDefault();
                            handlePasteAttempt();
                          }}
                          placeholder="Write your solution here..."
                        />
                      </div>

                      <div className="code-editor-footer">
                        <span>Spaces: 2</span>
                      </div>
                    </div>

                  </div>
                )}

                <p className="mt-4 text-xs font-semibold text-zinc-500">
                  Answers save automatically while you work. GLM will evaluate your final response after submission.
                </p>
              </article>
            );
          })}
        </section>

        <div className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-zinc-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_55%,#eef2f7_100%)] p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-500">Final step</p>
            <p className="mt-2 text-lg font-extrabold tracking-tight text-zinc-950">
              {allQuestionsAnswered ? 'Ready to submit' : 'Complete all questions first'}
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-500">
              {allQuestionsAnswered ? 'Your answers will be submitted for AI evaluation.' : `${completedAnswers}/${totalQuestions} questions answered.`}
            </p>
          </div>
          <button
            type="button"
            className="primary-cta inline-flex min-h-12 cursor-pointer items-center justify-center rounded-md px-6 text-sm font-extrabold shadow-[0_14px_34px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.24)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none"
            onClick={handleSubmit}
            disabled={submitDisabled}
          >
            {submitting ? 'Submitting...' : 'Submit interview'}
          </button>
        </div>
      </div>

      {mediaReady && (
        <div
          ref={cameraWidgetRef}
          className={`interview-camera-widget group fixed z-30 w-[210px] select-none touch-none rounded-md border border-zinc-800 bg-zinc-950 p-1.5 text-white shadow-2xl transition duration-200 sm:w-[250px] lg:w-[310px] ${
            isDraggingCamera ? 'cursor-grabbing scale-[1.02] shadow-[0_24px_60px_rgba(0,0,0,0.45)]' : 'cursor-grab hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.35)]'
          }`}
          style={{
            left: `${cameraWidgetPosition.x}px`,
            top: `${cameraWidgetPosition.y}px`,
          }}
          onPointerDown={handleCameraWidgetPointerDown}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">Live camera</p>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-300">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.55)]" />
              <span>Recording</span>
            </div>
          </div>
          <video
            ref={cameraPreviewRef}
            autoPlay
            muted
            playsInline
            className="mt-1.5 aspect-video w-full rounded-[4px] bg-zinc-900 object-cover"
          />
          <p className="mt-1.5 text-[11px] font-semibold leading-5 text-zinc-400">Keep your face visible in frame.</p>
        </div>
      )}

      {mediaLocked && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-500">
              Secure interview lock
            </div>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-zinc-950">Share your screen to reveal questions</h2>
            {mediaError && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {mediaError}
              </div>
            )}
            {mediaRequesting && (
              <div className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-extrabold text-zinc-700">
                Waiting for browser permission...
              </div>
            )}
            {mediaError && (
              <button
                type="button"
                className="primary-cta mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-md px-5 text-sm font-extrabold transition disabled:cursor-wait disabled:opacity-70"
                onClick={requestMediaAccess}
                disabled={mediaRequesting}
              >
                Try again and share screen
              </button>
            )}
            <p className="mt-3 text-xs font-semibold leading-5 text-zinc-500">
              If you denied permission by mistake, click the button again and approve both prompts.
            </p>
          </div>
        </div>
      )}

      {warning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-md border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-700">
              Integrity warning
            </div>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-zinc-950">{warning.title}</h2>
            <p className="mt-3 text-sm font-medium leading-6 text-zinc-600">{warning.message}</p>
            <p className="mt-3 text-sm font-semibold text-zinc-800">Current violations: {violationCount}/2</p>
            <button
              type="button"
              className="primary-cta mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md px-4 text-sm font-extrabold transition"
              onClick={() => setWarning(null)}
            >
              I understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewRoom;
