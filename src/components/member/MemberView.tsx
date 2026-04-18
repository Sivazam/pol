'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import gsap from 'gsap';
import { ChevronLeft, Activity, User, Calendar, MapPin, Briefcase, CreditCard, Shield } from 'lucide-react';
import GlobalSearch from '@/components/shared/GlobalSearch';
import Breadcrumb from '@/components/shared/Breadcrumb';

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
      <div className="w-full min-h-screen bg-[#F0F4F8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm tracking-widest uppercase" style={{ fontFamily: 'var(--font-jetbrains)' }}>Loading Member</p>
        </div>
      </div>
    );
  }

  if (!member) return (
    <div className="w-full min-h-screen bg-[#F0F4F8] flex items-center justify-center">
      <p className="text-red-600 font-medium">Member not found</p>
    </div>
  );

  const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const avatarColorMap = [
    { bg: 'bg-amber-100', text: 'text-amber-700' },
    { bg: 'bg-teal-100', text: 'text-teal-700' },
    { bg: 'bg-orange-100', text: 'text-orange-700' },
    { bg: 'bg-blue-100', text: 'text-blue-700' },
    { bg: 'bg-purple-100', text: 'text-purple-700' },
    { bg: 'bg-rose-100', text: 'text-rose-700' },
  ];
  const avatarStyle = avatarColorMap[member.name.length % avatarColorMap.length];

  return (
    <div ref={containerRef} className="w-full min-h-screen bg-[#F0F4F8]">
      {/* Tricolor Bar */}
      <div className="tricolor-bar" />

      {/* Top Nav - Navy gradient */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-[#0F2B46] to-[#1E3A5F]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="text-white/70 hover:text-white transition-colors text-sm flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">Back</span>
            </button>
            <div className="w-px h-6 bg-white/20" />
            <span className="text-sm text-white/60">{member.family.pdfNumber}</span>
          </div>
          <GlobalSearch />
          <div className="flex items-center gap-1.5 text-green-300 text-xs"><Activity className="w-3 h-3" /><span>LIVE</span></div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6"><Breadcrumb /></div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Avatar & Name */}
        <div className="anim-in opacity-0 flex flex-col items-center text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold mb-4 ${avatarStyle.bg} ${avatarStyle.text} shadow-md`}>
            {initials}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{member.name}</h1>
          {member.nameTelugu && <p className="text-slate-500 mt-1">{member.nameTelugu}</p>}
          <span className={`mt-3 text-xs px-3 py-1 rounded-full font-medium border ${
            member.relation === 'Head' ? 'bg-blue-50 text-blue-700 border-blue-200' :
            member.relation === 'Spouse' ? 'bg-purple-50 text-purple-700 border-purple-200' :
            'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {member.relation}
          </span>
        </div>

        {/* Details Card */}
        <div className="anim-in opacity-0 gov-card p-6">
          <h3 className="text-sm font-semibold text-slate-900 tracking-wide mb-5">PERSONAL INFORMATION</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Age', value: `${member.age} years${member.isMinor ? ' (Minor)' : ''}`, icon: Calendar },
              { label: 'Gender', value: member.gender, icon: User },
              { label: 'Aadhaar', value: member.aadhar || 'Not Available', icon: CreditCard },
              { label: 'Occupation', value: member.occupation || 'Not Available', icon: Briefcase },
              { label: 'Minor Status', value: member.isMinor ? 'Yes — Under 18' : 'No — Adult', icon: Shield },
              { label: 'Relation to Head', value: member.relation, icon: User },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-[#F8FAFC] rounded-lg">
                <div className="p-2 rounded-lg bg-white border border-slate-200">
                  <item.icon className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <p className="text-sm text-slate-900 font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Family Context */}
        <div className="anim-in opacity-0 gov-card p-6">
          <h3 className="text-sm font-semibold text-slate-900 tracking-wide mb-4">FAMILY CONTEXT</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg">
              <span className="text-xs text-slate-400">Family Head</span>
              <span className="text-sm text-slate-900 font-medium">{member.family.headName} ({member.family.headNameTelugu})</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg">
              <span className="text-xs text-slate-400">PDF Number</span>
              <span className="gov-badge text-amber-700 font-semibold">{member.family.pdfNumber}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg">
              <span className="text-xs text-slate-400">Village</span>
              <span className="text-sm text-slate-900 font-medium flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />{member.family.village.name} ({member.family.village.nameTelugu})</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg">
              <span className="text-xs text-slate-400">Mandal</span>
              <span className="text-sm text-slate-900 font-medium">{member.family.village.mandal.name} ({member.family.village.mandal.nameTelugu})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
