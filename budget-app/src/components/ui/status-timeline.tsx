import React from 'react';
import { ProposalStatus, Role } from '@/lib/types';
import { Check, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusTimelineProps {
    status: ProposalStatus;
    skipRegionHead?: boolean;
}

const steps = [
    { id: 'User', label: 'Diajukan', role: 'User' as Role },
    { id: 'Supervisor', label: 'Supervisor', role: 'Supervisor' as Role },
    { id: 'SubDeptHead', label: 'Sub Dept', role: 'SubDeptHead' as Role },
    { id: 'FinanceHead', label: 'Finance', role: 'FinanceHead' as Role },
    { id: 'RegionHead', label: 'Region Hub', role: 'RegionHead' as Role },
];

/**
 * The approval chain, drawn as a crop cycle: each stage a proposal clears is
 * padi green, the stage it is waiting on is Astra blue, and the final node
 * turns gold once it is approved — the harvest. Rejection is the only thing
 * in this component allowed to be Honda red.
 */
export function StatusTimeline({ status, skipRegionHead = false }: StatusTimelineProps) {
    const activeSteps = skipRegionHead
        ? steps.filter(s => s.role !== 'RegionHead')
        : steps;

    // Determine current step index based on status
    let currentIndex = 0;
    const isRejected = status === 'Rejected';

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
        currentIndex = 1;
    }

    const isApproved = status === 'Approved';

    return (
        <div className="flex w-full max-w-3xl items-center">
            {activeSteps.map((step, index) => {
                const isCompleted = index < currentIndex || isApproved;
                const isCurrent = index === currentIndex && !isRejected && !isApproved;
                const isFailed = index === currentIndex && isRejected;
                const isPending = index > currentIndex;
                const isHarvest = isApproved && index === activeSteps.length - 1;

                return (
                    <React.Fragment key={step.id}>
                        <div className="group relative flex flex-col items-center">
                            <div
                                className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors duration-200",
                                    isCompleted && "border-padi-500 bg-padi-500 text-white",
                                    isHarvest && "border-bulir-400 bg-bulir-400 text-bulir-950",
                                    isCurrent && "border-astra-600 bg-white text-astra-600 ring-4 ring-astra-100",
                                    isFailed && "border-honda-600 bg-honda-50 text-honda-600",
                                    isPending && "border-slate-300 bg-white text-slate-300"
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
                                isFailed && "text-honda-600"
                            )}>
                                {step.label}
                            </span>
                        </div>

                        {index < activeSteps.length - 1 && (
                            <div className={cn(
                                "mx-2 h-0.5 flex-1 transition-colors duration-200",
                                index < currentIndex || isApproved ? "bg-padi-400" : "bg-slate-200"
                            )} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
