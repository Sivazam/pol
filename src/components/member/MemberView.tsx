'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import gsap from 'gsap';
import { ChevronLeft, Activity, User, Calendar, MapPin, Briefcase, CreditCard, Shield } from 'lucide-react';

interface MemberData {
  id: string;
  name: string;
  nameTelugu: string | null;
  relation: string;
  age: number;
  gender: string;
  aadhar: string | null;
  occupation: string | null;
  isMinor: boolean;
  family: {
    id: string;
    pdfNumber: string;
    headName: string;
    headNameTelugu: string;
    village: {
      id: string; name: string; nameTelugu: string;
      mandal: { name: string; nameTelugu: string; };
    };
  };
}

export default function MemberView() {
  const selectedMemberId = useAppStore((s) => s.selectedMemberId);
  const goBack = useAppStore((s) => s.goBack);
  const setView = useAppStore((s) => s.setView);

  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedMemberId) { setView('dashboard'); return; }
    fetch(`/api/member/${selectedMemberId}`)
      .then(r => r.json())
      .then(data => { setMember(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedMemberId, setView]);

  useEffect(() => {
    if (!loading && containerRef.current) {
      const els = containerRef.current.querySelectorAll('.anim-in');
      gsap.fromTo(els, { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out' });
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Loading Member</p>
        </div>
      </div>
    );
  }

  if (!member) return <div className="w-full min-h-screen bg-[#0A0F1E] flex items-center justify-center"><p className="text-red-400">Member not found</p></div>;

  const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const avatarColors = ['#F59E0B', '#14B8A6', '#F97316', '#3B82F6', '#8B5CF6', '#EF4444'];
  const avatarColor = avatarColors[member.name.length % avatarColors.length];

  return (
    <div ref={containerRef} className="w-full min-h-screen bg-[#0A0F1E]">
      {/* Top Nav */}
      <div className="sticky top-0 z-50 bg-[#0A0F1E]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">Back</span>
            </button>
            <div className="w-px h-6 bg-white/10" />
            <span className="text-sm text-gray-400">{member.family.pdfNumber}</span>
          </div>
          <div className="flex items-center gap-1.5 text-green-400 text-xs"><Activity className="w-3 h-3" /><span>LIVE</span></div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Avatar & Name */}
        <div className="anim-in opacity-0 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mb-4" style={{ backgroundColor: `${avatarColor}20`, color: avatarColor }}>
            {initials}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{member.name}</h1>
          {member.nameTelugu && <p className="text-gray-400 mt-1">{member.nameTelugu}</p>}
          <span className={`mt-3 text-xs px-3 py-1 rounded-full font-medium ${
            member.relation === 'Head' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
            member.relation === 'Spouse' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' :
            'bg-gray-500/10 text-gray-400 border border-gray-500/30'
          }`}>
            {member.relation}
          </span>
        </div>

        {/* Details Card */}
        <div className="anim-in opacity-0 glow-card p-6">
          <h3 className="text-sm font-medium text-white tracking-wide mb-5">PERSONAL INFORMATION</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { label: 'Age', value: `${member.age} years${member.isMinor ? ' (Minor)' : ''}`, icon: Calendar },
              { label: 'Gender', value: member.gender, icon: User },
              { label: 'Aadhaar', value: member.aadhar || 'Not Available', icon: CreditCard },
              { label: 'Occupation', value: member.occupation || 'Not Available', icon: Briefcase },
              { label: 'Minor Status', value: member.isMinor ? 'Yes — Under 18' : 'No — Adult', icon: Shield },
              { label: 'Relation to Head', value: member.relation, icon: User },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white/5">
                  <item.icon className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-sm text-white font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Family Context */}
        <div className="anim-in opacity-0 glow-card p-6">
          <h3 className="text-sm font-medium text-white tracking-wide mb-4">FAMILY CONTEXT</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Family Head</span>
              <span className="text-sm text-white">{member.family.headName} ({member.family.headNameTelugu})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">PDF Number</span>
              <span className="gov-badge text-amber-400">{member.family.pdfNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Village</span>
              <span className="text-sm text-white flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-500" />{member.family.village.name} ({member.family.village.nameTelugu})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Mandal</span>
              <span className="text-sm text-white">{member.family.village.mandal.name} ({member.family.village.mandal.nameTelugu})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
