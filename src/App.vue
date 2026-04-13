<script setup lang="ts">
import { computed, ref } from "vue";
import { makeDraggable, makeDroppable } from "@vue-dnd-kit/core";

const cardRef = ref<HTMLElement | null>(null);
const boxRef = ref<HTMLElement | null>(null);
const location = ref<"start" | "box">("start");

const card = makeDraggable(cardRef, { id: "card-1" });
const box = makeDroppable(boxRef, {
    events: {
        onDrop: () => {
            if (location.value === "box") {
                return;
            }

            location.value = "box";
            console.log("location:", location.value);
        },
    },
});

const isInBox = computed(() => location.value === "box");
</script>

<template>
    <main class="page">
        <p class="value">Changed to: {{ location }}</p>

        <div
            id="start-slot"
            class="slot start-slot"
            :class="{ hidden: isInBox }"
        />

        <div
            ref="boxRef"
            class="box"
            :class="{ over: !!box.isDragOver.value, filled: isInBox }"
        >
            <span v-if="!isInBox">Drop here</span>
            <div id="box-slot" class="slot box-slot" />
        </div>

        <Teleport :to="isInBox ? '#box-slot' : '#start-slot'">
            <div
                ref="cardRef"
                class="card"
                :class="{ dragging: card.isDragging.value }"
            >
                Card value: {{ location }}
            </div>
        </Teleport>
    </main>
</template>

<style scoped>
.page {
    min-height: 100vh;
    display: grid;
    place-content: center;
    gap: 20px;
    justify-items: center;
    font-family: Inter, sans-serif;
}

.value {
    margin: 0;
    font: 600 14px/1.2 var(--mono, monospace);
    color: #475569;
}

.slot {
    display: grid;
    place-items: center;
}

.start-slot {
    min-height: 56px;
}

.start-slot.hidden {
    min-height: 0;
}

.card {
    padding: 16px 20px;
    border-radius: 12px;
    background: #111827;
    color: white;
    cursor: grab;
    user-select: none;
}

.card.dragging {
    opacity: 0.5;
}

.box {
    width: 260px;
    min-height: 140px;
    padding: 18px;
    border: 2px dashed #94a3b8;
    border-radius: 16px;
    display: grid;
    place-items: center;
    gap: 12px;
    background: #f8fafc;
    box-sizing: border-box;
}

.box-slot {
    width: 100%;
    min-height: 56px;
}

.box.over,
.box.filled {
    background: #dbeafe;
    border-color: #2563eb;
}
</style>
