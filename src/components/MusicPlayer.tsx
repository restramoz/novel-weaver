import { useState, useRef, useEffect, useCallback } from "react";
import { Volume2, VolumeX, Play, Pause, Repeat, Music, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface MusicPlayerProps {
  tracks: Array<{ id: string; file_url: string; title: string | null }>;
  onAddTrack?: () => void;
}

export function MusicPlayer({ tracks, onAddTrack }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (tracks.length === 0) return;
    const audio = new Audio(tracks[currentTrack]?.file_url);
    audio.loop = isLooping;
    audio.volume = isMuted ? 0 : volume;
    audioRef.current = audio;

    audio.addEventListener("ended", () => {
      if (!isLooping && currentTrack < tracks.length - 1) {
        setCurrentTrack((p) => p + 1);
      } else {
        setIsPlaying(false);
      }
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [currentTrack, tracks]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || tracks.length === 0) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, tracks.length]);

  if (tracks.length === 0 && !onAddTrack) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isExpanded ? (
        <div className="bg-card border border-border rounded-xl shadow-2xl p-4 w-72 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-card-foreground">BGM Player</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsExpanded(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>

          {tracks.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground mb-3 truncate">
                {tracks[currentTrack]?.title || "Track " + (currentTrack + 1)}
              </p>
              <div className="flex items-center gap-2 mb-3">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlay}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  variant={isLooping ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsLooping(!isLooping)}
                >
                  <Repeat className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMuted(!isMuted)}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  onValueChange={([v]) => { setVolume(v / 100); setIsMuted(false); }}
                  max={100}
                  className="flex-1"
                />
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground mb-3">Belum ada musik.</p>
          )}

          {onAddTrack && (
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={onAddTrack}>
              + Tambah Musik
            </Button>
          )}
        </div>
      ) : (
        <Button
          onClick={() => setIsExpanded(true)}
          className="h-12 w-12 rounded-full shadow-lg novel-gradient"
          size="icon"
        >
          <Music className="h-5 w-5 text-primary-foreground" />
        </Button>
      )}
    </div>
  );
}
