#!/usr/bin/env python3
"""Build copyright-original synthetic chimes/pads for Lunar Vault.

No samples, pre-recorded music, external assets, or network calls.
The result is a Howler-compatible audio sprite with correctly measured durations.
"""
from __future__ import annotations
import json, math, os, subprocess, sys
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parent
SR=32000
RNG=np.random.default_rng(112358)

MUSIC=["bgm_main", "bgm_freespin", "bgm_winlevel_big", "bgm_winlevel_epic", "bgm_winlevel_max", "bgm_winlevel_mega", "bgm_winlevel_superwin"]
FX=["jng_intro_fs","sfx_anticipation","sfx_anticipation_start","sfx_bigwin_coinloop",
"sfx_btn_general","sfx_btn_spin","sfx_fs_respins","sfx_multiplier_combine_a","sfx_multiplier_combine_b",
"sfx_multiplier_explosion_a","sfx_multiplier_explosion_b","sfx_multiplier_explosion_c","sfx_multiplier_landing",
"sfx_multiplier_reset","sfx_multiplier_up","sfx_multiplier_update","sfx_multiplier_win",
"sfx_reel_stop_1","sfx_reel_stop_2","sfx_reel_stop_3","sfx_reel_stop_4","sfx_reel_stop_5",
"sfx_royals_landing","sfx_scatter_reveal","sfx_scatter_stop_1","sfx_scatter_stop_2",
"sfx_scatter_stop_3","sfx_scatter_stop_4","sfx_scatter_stop_5","sfx_scatter_win",
"sfx_scatter_win_v2","sfx_superfreespin","sfx_symbols_landing","sfx_wild_explode",
"sfx_winlevel_end","sfx_winlevel_nice","sfx_winlevel_small","sfx_winlevel_standard",
"sfx_winlevel_substantial","sfx_youwon_panel","tumble_win_1","tumble_win_2","tumble_win_3","tumble_win_4","tumble_win_5"]

def tvec(sec:float)->np.ndarray:
    return np.arange(round(sec*SR),dtype=np.float64)/SR

def softclip(x):
    return np.tanh(x*1.2)*0.84

def note(freq:float, length:float, decay:float=2.5)->np.ndarray:
    t=tvec(length)
    e=(1-np.exp(-t*35))*np.exp(-t*decay)
    partial=sum((.56/h**1.5)*np.sin(2*np.pi*(freq*h)*t + h*.12) for h in (1,2,3,4,5))
    return e*partial

def pad(freqs:list[float],sec:float,variant=0)->np.ndarray:
    t=tvec(sec)
    # Synthesised moving chord with slow timbral evolution; zero at loop boundaries.
    loop_envelope=np.sin(np.pi*np.minimum(1, t/.45))**2 * np.sin(np.pi*np.minimum(1,(sec-t)/.45))**2
    y=np.zeros(len(t))
    for i,f in enumerate(freqs):
        detune=0.11*np.sin(2*np.pi*t/(sec/(i+2)))
        osc=np.sin(2*np.pi*f*t + detune)+.22*np.sin(2*np.pi*2*f*t+.47)+.08*np.sin(2*np.pi*3*f*t+.27)
        y+=osc/(len(freqs)*1.7)
    step=sec/8
    for i in range(8):
        at=step*i + .18
        if at>=sec:continue
        key=freqs[(i*3+variant)%len(freqs)]*(2.0 if i%3 else 4.0)
        arpeggio=note(key,.8,6.1)
        ix=round(at*SR)
        count=min(len(arpeggio),len(y)-ix)
        if count>0:y[ix:ix+count]+=arpeggio[:count]*.18
    return y*loop_envelope*.67

def soundfx(name:str,index:int)->np.ndarray:
    duration=(1.8 if name.startswith('jng_') else
             1.6 if 'winlevel' in name or 'scatter_win' in name else
             1.0 if 'anticipation' in name or 'respins' in name else
             .9 if 'multiplier' in name or 'superfreespin' in name else
             .56 if 'reel_stop' in name else
             .48 if 'btn_' in name else .85)
    t=tvec(duration)
    base=220*(2**(((index*7)%18-9)/12))
    if name.startswith('sfx_reel_stop') or name.startswith('sfx_btn'):
        percussive=np.sin(2*np.pi*(base*(1+3*np.exp(-25*t)))*t)
        noise=RNG.normal(0,1,len(t))
        y=(percussive*.35+noise*.16)*np.exp(-t*27)
    elif 'anticipation' in name:
        sweep=np.sin(2*np.pi*(base*t + 165*t**2))
        y=(sweep*.22 + .14*np.sin(2*np.pi*(base*.5)*t))*np.sin(np.pi*t/duration)**2
    elif 'explosion' in name or 'wild' in name:
        noise=RNG.normal(0,1,len(t))
        # A shorter burst with low-frequency impact, but no clipping.
        y=(.22*noise+.7*np.sin(2*np.pi*base*(t-.2*t*t)))*np.exp(-6*t)
    elif 'scatter' in name or 'multiplier' in name or 'win' in name or 'jng_' in name:
        pitches=[base*1.0,base*1.25,base*1.5,base*2.0]
        y=np.zeros(len(t))
        for i,freq in enumerate(pitches):
            delay=round(i*.11*SR)
            nt=note(freq,duration,3.1)
            remaining=min(len(y)-delay,len(nt))
            if remaining>0:y[delay:delay+remaining]+=.27*nt[:remaining]
    else:
        nt=note(base,duration,6.0)
        y=.6*nt[:len(t)]
    return softclip(y)*.82

def make():
    # Group all segments with 20 ms empty guard intervals for exact sprite boundaries.
    samples=[]; sprites={}; position=0
    def add(name, data,loop=False):
        nonlocal position
        data=np.asarray(data,dtype=np.float64)
        # rounded to millisecond to avoid audio-sprite truncation at boundaries
        data=np.pad(data,(0,(-len(data))%32))
        start_ms=position//32
        duration_ms=len(data)//32
        sprites[name]=[start_ms,duration_ms,*([True] if loop else [])]
        samples.append(data)
        guard=np.zeros(32*35,dtype=np.float64)
        samples.append(guard)
        position +=len(data)+len(guard)

    progress=[ [146.83,174.61,220.0,293.66], [164.81,196.00,246.94,329.63],
               [174.61,220,261.63,349.23],[196,246.94,293.66,392],
               [220,261.63,329.63,440],[146.83,185,233.08,293.66],
               [164.81,207.65,246.94,329.63] ]
    for i,name in enumerate(MUSIC):
        sec=7.5 if i<2 else 2.8
        add(name,pad(progress[i],sec,i),loop=True)
    for i,name in enumerate(FX):
        add(name,soundfx(name,i),loop=('coinloop' in name))

    audio=np.concatenate(samples)
    mx=np.max(np.abs(audio))
    if mx > .9:audio=audio*.9/mx
    wav=ROOT/'sounds.wav'
    import wave
    with wave.open(str(wav),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR)
        w.writeframes((audio*32767).astype('<i2').tobytes())
    for ext,codec,br in [('ogg','libvorbis','72k'),('mp3','libmp3lame','80k'),('m4a','aac','80k')]:
        dest=ROOT/f'sounds.{ext}'
        subprocess.run(['ffmpeg','-nostdin','-y','-loglevel','error','-i',str(wav),'-ac','1','-ar',str(SR),'-c:a',codec,'-b:a',br,str(dest)],check=True)
    meta={'sprite':sprites,'src':['./assets/audio/sounds.ogg','./assets/audio/sounds.m4a','./assets/audio/sounds.mp3'],
          'config':{k:{'volume': (0.20 if k.startswith('bgm_') else 0.52)} for k in sprites}}
    (ROOT/'sounds.json').write_text(json.dumps(meta,indent=2)+'\n')
    assert all(a>=0 and b>0 for a,b,*_ in sprites.values())
    assert len(sprites)==len(MUSIC)+len(FX)
    (ROOT/'REPORT.txt').write_text(f'Original synthetic audio cues: {len(sprites)}\nDuration: {position/SR:.2f}s\n\n'+ '\n'.join(f'{p.name}: {p.stat().st_size:,} bytes' for p in [ROOT/'sounds.ogg',ROOT/'sounds.mp3',ROOT/'sounds.m4a']))
    print((ROOT/'REPORT.txt').read_text())
if __name__ == '__main__':make()