# Azure Speech pronunciation assessment

This feature is optional and remains disabled until an adult service operator configures it.

## What it evaluates

The Skills Lab offers eight short read-aloud tasks. The browser records the learner's voice only after the learner checks the consent box. The recording is converted in the browser to mono PCM WAV at 16 kHz and posted to the Quiet English server.

The server uses a fixed reference sentence for each task; the browser cannot submit arbitrary text to the paid speech endpoint. When enabled, the server forwards the audio to Azure Speech pronunciation assessment and returns:
- overall pronunciation score;
- phoneme/word accuracy;
- fluency and completeness;
- prosody (stress, rhythm and intonation);
- word-level flags such as mispronunciation, omission or insertion.

The locale is `en-US` so the full prosody score is available. A score is an automated practice signal, not a certification or a definitive judgement of someone's accent.

## Adult operator setup

1. A parent/guardian or another trusted adult who manages the service should create and own the Azure Speech resource, review Microsoft's privacy terms, and check the current Speech-to-Text and pronunciation-assessment pricing. Prosody assessment may have an additional charge.
2. In the Azure resource, obtain its key and region. Do not paste the key into chat, a GitHub issue, source code, or this document.
3. Open the Render service's **Environment** page and add these variables:
   - `AZURE_SPEECH_ENABLED` = `true`
   - `AZURE_SPEECH_KEY` = the resource key
   - `AZURE_SPEECH_REGION` = the exact resource region (for example, `westeurope`)
4. Save the environment variables. Render will redeploy the service.
5. Open `/api/speech/pronunciation/status`. The response should contain `"configured":true`.
6. Test with a short read-aloud task and verify that the score, phonemes and word-level notes appear.

If the adult operator has not reviewed the provider, cost and privacy requirements, leave `AZURE_SPEECH_ENABLED` unset or set it to `false`. Without this flag and the two credentials, the server returns a not-configured status and does not accept recordings for assessment.

## Privacy and safeguards

- Recordings are not written to disk or saved in PostgreSQL by Quiet English.
- The server forwards the audio to the configured Azure Speech resource only after the in-page consent step.
- The server returns a sanitized result. Learner history stores only the task ID, score, word count and duration; it does not store audio, phoneme detail or transcript.
- Pronunciation checks are limited to 1–30 second mono PCM WAV at 16 kHz and at most 4 requests per IP per 15 minutes.
- Only eight server-defined reference passages are accepted; users cannot supply arbitrary assessment text.
- A learner under 18 should use the external voice assessment only after a parent or legal guardian has reviewed and approved it. Do not record other people or include private information.
- Azure processes the audio as an external provider. The service operator must describe this processing in the site's privacy notice before enabling it.

## Technical notes

The implementation uses the short-audio Speech-to-Text REST endpoint with the `Pronunciation-Assessment` header, `Granularity=Phoneme`, `Dimension=Comprehensive`, and prosody assessment enabled. Keep recordings short: Microsoft's REST documentation says pronunciation-assessment audio should be no longer than 30 seconds. The UI stops recording after 25 seconds.

Official documentation:
- https://learn.microsoft.com/azure/ai-services/speech-service/how-to-pronunciation-assessment
- https://learn.microsoft.com/azure/ai-services/speech-service/rest-speech-to-text-short
