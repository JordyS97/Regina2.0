import React from 'react';
import { ProposalStatus, Role } from '@/lib/types';
import { Check, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusTimelineProps {
    status: ProposalStatus;
    skipRegionHead?: boolean;
}

const steps = [
    { id: 'User', label: 'Submitted', role: 'User' as Role },
    { id: 'Supervisor', label: 'Supervisor', role: 'Supervisor' as Role },
    { id: 'SubDeptHead', label: 'Sub Dept', role: 'SubDeptHead' as Role },
    { id: 'FinanceHead', label: 'Finance', role: 'FinanceHead' as Role },
    { id: 'RegionHead', label: 'Region Hub', role: 'RegionHead' as Role },
];

export function StatusTimeline({ status, skipRegionHead = false }: StatusTimelineProps) {
    const activeSteps = skipRegionHead
        ? steps.filter(s => s.role !== 'RegionHead')
        : steps;

    // Determine current step index based on status
    let currentIndex = 0;
    let isRejected = status === 'Rejected';

    if (status === 'Approved') {
        currentIndex = activeSteps.length - 1; // All steps passed (last step index)
    } else if (status === 'Pending Supervisor') {
        currentIndex = 1;
    } else if (status === 'Pending Sub Dept') {
        currentIndex = 2;
    } else if (status === 'Pending Finance') {
        currentIndex = 3;
    } else if (status === 'Pending Region') {
        currentIndex = 4;
    } else if (status === 'Rejected') {
        // We would ideally know *who* rejected it to show the timeline accurately,
        // but for the mockup, we'll mark it rejected at the current assumed stage.
        // Assuming rejection stops the timeline.
        // In a real app we'd parse the history.
        currentIndex = 1;
    }

    return (
        <div className="flex items-center w-full max-w-3xl">
            {activeSteps.map((step, index) => {
                const isCompleted = index < currentIndex || status === 'Approved';
                const isCurrent = index === currentIndex && !isRejected;
                const isFailed = index === currentIndex && isRejected;
                const isPending = index > currentIndex;

                return (
                    <React.Fragment key={step.id}>
                        {/* Step Icon */}
                        <div className="relative flex flex-col items-center group">
                            <div
                                className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                                    isCompleted ? "bg-blue-600 border-blue-600 text-white" : "",
                                    isCurrent ? "border-blue-600 text-blue-600 bg-white" : "",
                                    isFailed ? "border-red-500 bg-red-50 text-red-600" : "",
                                    isPending ? "border-slate-300 bg-white text-slate-300" : ""
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="h-4 w-4" strokeWidth={3} />
                                ) : isFailed ? (
                                    <X className="h-4 w-4" strokeWidth={3} />
                                ) : isCurrent ? (
                                    <Clock className="h-4 w-4" strokeWidth={2.5} />
                                ) : (
                                    <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                                )}
                            </div>
                            <span className={cn(
                                "absolute top-10 whitespace-nowrap text-xs font-semibold",
                                (isCompleted || isCurrent) ? "text-slate-800" : "text-slate-400",
                                isFailed ? "text-red-600" : ""
                            )}>
                                {step.label}
                            </span>
                        </div>

                        {/* Connector Line */}
                        {index < activeSteps.length - 1 && (
                            <div className={cn(
                                "flex-1 h-0.5 mx-2 transition-colors",
                                index < currentIndex || status === 'Approved' ? "bg-blue-600" : "bg-slate-200"
                            )} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
