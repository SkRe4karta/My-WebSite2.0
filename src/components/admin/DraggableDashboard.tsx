"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Widget = {
  id: string;
  title: string;
  content: React.ReactNode;
  height: number;
  visible: boolean;
};

type DraggableWidgetProps = {
  widget: Widget;
  onToggleVisibility: (id: string) => void;
  onResize: (id: string, height: number) => void;
};

function DraggableWidget({ widget, onToggleVisibility, onResize }: DraggableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    minHeight: `${widget.height}px`,
  };

  if (!widget.visible) {
    return (
      <div className="glass-panel border border-[#4CAF50]/40 p-4 text-center">
        <button
          onClick={() => onToggleVisibility(widget.id)}
          className="text-sm text-[#4CAF50] hover:text-[#45a049] transition-colors"
        >
          Показать виджет: {widget.title}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="glass-panel border border-[#4CAF50]/40 transition-all duration-300 hover:border-[#4CAF50]/60 hover:bg-[#333] hover:shadow-[0_0_20px_rgba(76,175,80,0.2)]"
    >
      <div className="flex items-center justify-between border-b border-[#4CAF50]/30 p-4">
        <div
          {...attributes}
          {...listeners}
          className="flex cursor-grab items-center gap-2 text-[#4CAF50] hover:text-[#45a049] active:cursor-grabbing"
        >
          <span className="text-lg">☰</span>
          <h3 className="font-semibold">{widget.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onResize(widget.id, Math.max(200, widget.height - 50))}
            className="rounded px-2 py-1 text-xs text-[#cccccc] hover:bg-[#444] transition-colors"
            title="Уменьшить высоту"
          >
            −
          </button>
          <button
            onClick={() => onResize(widget.id, widget.height + 50)}
            className="rounded px-2 py-1 text-xs text-[#cccccc] hover:bg-[#444] transition-colors"
            title="Увеличить высоту"
          >
            +
          </button>
          <button
            onClick={() => onToggleVisibility(widget.id)}
            className="rounded px-2 py-1 text-xs text-[#cccccc] hover:bg-[#444] transition-colors"
            title="Скрыть виджет"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="p-4">{widget.content}</div>
    </div>
  );
}

type DraggableDashboardProps = {
  widgets: Widget[];
  onWidgetsChange: (widgets: Widget[]) => void;
};

export default function DraggableDashboard({ widgets, onWidgetsChange }: DraggableDashboardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((w) => w.id === active.id);
      const newIndex = widgets.findIndex((w) => w.id === over.id);
      const newWidgets = arrayMove(widgets, oldIndex, newIndex);
      onWidgetsChange(newWidgets);
    }
  }

  const handleToggleVisibility = (id: string) => {
    const newWidgets = widgets.map((w) =>
      w.id === id ? { ...w, visible: !w.visible } : w
    );
    onWidgetsChange(newWidgets);
    localStorage.setItem("admin-widgets", JSON.stringify(newWidgets));
  };

  const handleResize = (id: string, height: number) => {
    const newWidgets = widgets.map((w) =>
      w.id === id ? { ...w, height } : w
    );
    onWidgetsChange(newWidgets);
    localStorage.setItem("admin-widgets", JSON.stringify(newWidgets));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={widgets.map((w) => w.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-6">
          {widgets.map((widget) => (
            <DraggableWidget
              key={widget.id}
              widget={widget}
              onToggleVisibility={handleToggleVisibility}
              onResize={handleResize}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

