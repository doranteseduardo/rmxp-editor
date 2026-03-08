use rodio::{Decoder, OutputStream, Sink};
use std::fs::File;
use std::io::BufReader;
use std::path::PathBuf;
use std::sync::mpsc;
use std::sync::Mutex;

/// Messages sent to the dedicated audio thread.
enum AudioMsg {
    Play {
        path: PathBuf,
        volume: f32,
        result_tx: mpsc::Sender<Result<(), String>>,
    },
    Stop,
    IsPlaying {
        result_tx: mpsc::Sender<bool>,
    },
    Shutdown,
}

/// Handle to communicate with the audio thread.
pub struct AudioHandle {
    tx: mpsc::Sender<AudioMsg>,
}

impl AudioHandle {
    /// Spawn a dedicated audio thread and return a handle to it.
    pub fn new() -> Self {
        let (tx, rx) = mpsc::channel::<AudioMsg>();

        std::thread::spawn(move || {
            // Create the output stream on this thread — it stays here and is never sent.
            let stream_result = OutputStream::try_default();
            let (_stream, handle) = match stream_result {
                Ok(pair) => pair,
                Err(e) => {
                    eprintln!("[audio] Failed to open audio device: {}", e);
                    // Drain messages so senders don't block
                    for msg in rx {
                        match msg {
                            AudioMsg::Play { result_tx, .. } => {
                                let _ = result_tx.send(Err(format!("No audio device: {}", e)));
                            }
                            AudioMsg::IsPlaying { result_tx, .. } => {
                                let _ = result_tx.send(false);
                            }
                            AudioMsg::Shutdown => break,
                            _ => {}
                        }
                    }
                    return;
                }
            };

            let mut current_sink: Option<Sink> = None;

            for msg in rx {
                match msg {
                    AudioMsg::Play { path, volume, result_tx } => {
                        // Stop previous
                        if let Some(old) = current_sink.take() {
                            old.stop();
                        }

                        let result = (|| -> Result<Sink, String> {
                            let file = File::open(&path)
                                .map_err(|e| format!("Failed to open audio file: {}", e))?;
                            let reader = BufReader::new(file);
                            let source = Decoder::new(reader)
                                .map_err(|e| format!("Failed to decode audio: {}", e))?;
                            let sink = Sink::try_new(&handle)
                                .map_err(|e| format!("Failed to create sink: {}", e))?;
                            sink.set_volume(volume.clamp(0.0, 1.0));
                            sink.append(source);
                            Ok(sink)
                        })();

                        match result {
                            Ok(sink) => {
                                current_sink = Some(sink);
                                let _ = result_tx.send(Ok(()));
                            }
                            Err(e) => {
                                let _ = result_tx.send(Err(e));
                            }
                        }
                    }
                    AudioMsg::Stop => {
                        if let Some(old) = current_sink.take() {
                            old.stop();
                        }
                    }
                    AudioMsg::IsPlaying { result_tx } => {
                        let playing = current_sink
                            .as_ref()
                            .map(|s| !s.empty())
                            .unwrap_or(false);
                        let _ = result_tx.send(playing);
                    }
                    AudioMsg::Shutdown => {
                        if let Some(old) = current_sink.take() {
                            old.stop();
                        }
                        break;
                    }
                }
            }

            eprintln!("[audio] Audio thread exiting");
        });

        AudioHandle { tx }
    }
}

/// Resolve an audio file path from the project directory.
fn resolve_audio_path(
    project_path: &str,
    asset_type: &str,
    asset_name: &str,
) -> Result<PathBuf, String> {
    let project = PathBuf::from(project_path);
    let (base_dir, dir, extensions): (&str, &str, &[&str]) = match asset_type {
        "bgm" => ("Audio", "BGM", &["ogg", "mp3", "wav", "mid", "midi", "wma"]),
        "bgs" => ("Audio", "BGS", &["ogg", "mp3", "wav", "mid", "midi", "wma"]),
        "me" => ("Audio", "ME", &["ogg", "mp3", "wav", "mid", "midi", "wma"]),
        "se" => ("Audio", "SE", &["ogg", "mp3", "wav", "mid", "midi", "wma"]),
        _ => return Err(format!("Not an audio type: {}", asset_type)),
    };

    let base_path = project.join(base_dir).join(dir).join(asset_name);

    for ext in extensions {
        let path = base_path.with_extension(ext);
        if path.exists() {
            // Check for unsupported MIDI
            if *ext == "mid" || *ext == "midi" {
                return Err(
                    "MIDI preview is not supported. Only OGG, MP3, and WAV files can be previewed."
                        .to_string(),
                );
            }
            return Ok(path);
        }
    }
    if base_path.exists() {
        return Ok(base_path);
    }

    Err(format!(
        "Audio file not found: {}/{}",
        asset_type, asset_name
    ))
}

/// Preview an audio file. Stops any currently playing preview first.
#[tauri::command]
pub async fn preview_audio(
    audio: tauri::State<'_, Mutex<AudioHandle>>,
    project_path: String,
    asset_type: String,
    asset_name: String,
    volume: f32,
) -> Result<(), String> {
    let path = resolve_audio_path(&project_path, &asset_type, &asset_name)?;

    eprintln!("[audio] Playing preview: {:?}", path);

    let (result_tx, result_rx) = mpsc::channel();
    {
        let handle = audio.lock().map_err(|e| format!("Lock error: {}", e))?;
        handle
            .tx
            .send(AudioMsg::Play {
                path,
                volume,
                result_tx,
            })
            .map_err(|_| "Audio thread not running".to_string())?;
    }

    result_rx
        .recv()
        .map_err(|_| "Audio thread did not respond".to_string())?
}

/// Stop the currently playing audio preview.
#[tauri::command]
pub async fn stop_audio(audio: tauri::State<'_, Mutex<AudioHandle>>) -> Result<(), String> {
    let handle = audio.lock().map_err(|e| format!("Lock error: {}", e))?;
    let _ = handle.tx.send(AudioMsg::Stop);
    eprintln!("[audio] Stopped preview");
    Ok(())
}

/// Check if audio is currently playing.
#[tauri::command]
pub async fn is_audio_playing(audio: tauri::State<'_, Mutex<AudioHandle>>) -> Result<bool, String> {
    let (result_tx, result_rx) = mpsc::channel();
    {
        let handle = audio.lock().map_err(|e| format!("Lock error: {}", e))?;
        handle
            .tx
            .send(AudioMsg::IsPlaying { result_tx })
            .map_err(|_| "Audio thread not running".to_string())?;
    }
    result_rx
        .recv()
        .map_err(|_| "Audio thread did not respond".to_string())
}
