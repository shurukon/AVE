"use client";

import {
  ResizableHandle, ResizablePanel, ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Toolbar } from "@/components/palmier/Toolbar";
import { MediaPanel } from "@/components/palmier/MediaPanel";
import { PreviewPanel } from "@/components/palmier/PreviewPanel";
import { Timeline } from "@/components/palmier/Timeline";
import { Inspector } from "@/components/palmier/Inspector";
import { AgentPanel } from "@/components/palmier/AgentPanel";
import { StatusBar } from "@/components/palmier/StatusBar";
import { PalmierToast } from "@/components/palmier/PalmierToast";
import { usePalmier } from "@/lib/palmier/store";

export default function Home() {
  const showAgent = usePalmier((s) => s.showAgent);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <Toolbar />

      {/* Main editor area */}
      <div className="relative flex flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left: Media */}
          <ResizablePanel defaultSize={18} minSize={12} maxSize={30}>
            <MediaPanel />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center: Preview + Timeline */}
          <ResizablePanel defaultSize={64} minSize={40}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={60} minSize={20}>
                <PreviewPanel />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={20}>
                <Timeline />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right: Inspector */}
          <ResizablePanel defaultSize={18} minSize={12} maxSize={32}>
            <Inspector />
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Agent panel overlays on the right edge */}
        <AgentPanel open={showAgent} onClose={() => usePalmier.getState().toggleAgent()} />
      </div>

      <StatusBar />
      <PalmierToast />
    </div>
  );
}
