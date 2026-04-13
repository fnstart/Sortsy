<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { X } from "lucide-vue-next";
import { Badge } from "@/main/components/ui/badge";
import { Button } from "@/main/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/main/components/ui/dialog";
import { Input } from "@/main/components/ui/input";

type TierCard = {
    id: string;
    mainIndexName: string;
    label: string;
};

type TierRow = {
    id: string;
    label: string;
    color: string;
    cards: TierCard[];
};

type CardState = {
    id: string;
    mainIndexName: string;
    category: string;
    flexOrder: number;
};

type DragState = {
    cardId: string;
    label: string;
    pointerId: number;
    width: number;
    height: number;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
};

const tiers = ref<TierRow[]>([
    { id: "s", label: "S", color: "#ef4444", cards: [] },
    { id: "a", label: "A", color: "#f97316", cards: [] },
    { id: "b", label: "B", color: "#f59e0b", cards: [] },
    { id: "c", label: "C", color: "#22c55e", cards: [] },
    {
        id: "pool",
        label: "Pool",
        color: "#64748b",
        cards: [
            { id: "card-1", mainIndexName: "IDX-001", label: "Apple" },
            { id: "card-2", mainIndexName: "IDX-002", label: "Banana" },
            { id: "card-3", mainIndexName: "IDX-003", label: "Cherry" },
            { id: "card-4", mainIndexName: "IDX-004", label: "Date" },
        ],
    },
]);

const draggingCardId = ref<string | null>(null);
const dragState = ref<DragState | null>(null);
const dropSlot = ref<{ tierId: string; index: number } | null>(null);
const lastMove = ref<CardState | null>(null);
const isAddCardDialogOpen = ref(false);
const isDeleteDialogOpen = ref(false);
const deleteTarget = ref<TierCard | null>(null);
const newCardLabel = ref("");
const newCardMainIndexName = ref("");

const cardState = computed<CardState[]>(() =>
    tiers.value.flatMap((tier) =>
        tier.cards.map((card, index) => ({
            id: card.id,
            mainIndexName: card.mainIndexName,
            category: tier.label,
            flexOrder: index + 1,
        })),
    ),
);

const poolTier = computed(
    () => tiers.value.find((tier) => tier.id === "pool") ?? null,
);

const canAddCard = computed(
    () =>
        newCardLabel.value.trim().length > 0 &&
        newCardMainIndexName.value.trim().length > 0,
);

const isDragging = computed(() => dragState.value !== null);

watch(isAddCardDialogOpen, (open) => {
    if (!open) {
        newCardLabel.value = "";
        newCardMainIndexName.value = "";
    }
});

watch(isDeleteDialogOpen, (open) => {
    if (!open) {
        deleteTarget.value = null;
    }
});

onBeforeUnmount(() => {
    cleanupDrag();
});

function findTierByCardId(cardId: string) {
    return tiers.value.find((tier) =>
        tier.cards.some((card) => card.id === cardId),
    );
}

function getCardLocation(cardId: string) {
    const tier = findTierByCardId(cardId);

    if (!tier) {
        return null;
    }

    const index = tier.cards.findIndex((card) => card.id === cardId);

    if (index === -1) {
        return null;
    }

    return { tier, index };
}

function findCardState(cardId: string) {
    return cardState.value.find((row) => row.id === cardId) ?? null;
}

function printCardState(cardId: string) {
    lastMove.value = findCardState(cardId);
    console.log("card state:", lastMove.value);
    console.table(cardState.value);
}

function beginDrag(card: TierCard, event: PointerEvent) {
    if (event.button !== 0) {
        return;
    }

    const location = getCardLocation(card.id);
    const element = event.currentTarget as HTMLElement | null;

    if (!location || !element) {
        return;
    }

    const rect = element.getBoundingClientRect();

    draggingCardId.value = card.id;
    dragState.value = {
        cardId: card.id,
        label: card.label,
        pointerId: event.pointerId,
        width: rect.width,
        height: rect.height,
        x: rect.left,
        y: rect.top,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
    };
    dropSlot.value = {
        tierId: location.tier.id,
        index: location.index,
    };

    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    event.preventDefault();
}

function onPointerMove(event: PointerEvent) {
    if (!dragState.value || event.pointerId !== dragState.value.pointerId) {
        return;
    }

    dragState.value = {
        ...dragState.value,
        x: event.clientX - dragState.value.offsetX,
        y: event.clientY - dragState.value.offsetY,
    };

    updateDropSlotFromPointer(event.clientX, event.clientY);
    event.preventDefault();
}

function onPointerUp(event: PointerEvent) {
    if (!dragState.value || event.pointerId !== dragState.value.pointerId) {
        return;
    }

    const nextSlot = dropSlot.value;
    const cardId = dragState.value.cardId;

    cleanupDrag();

    if (nextSlot) {
        moveCard(cardId, nextSlot.tierId, nextSlot.index);
    }
}

function cleanupDrag() {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    document.body.style.userSelect = "";
    draggingCardId.value = null;
    dragState.value = null;
    dropSlot.value = null;
}

function updateDropSlotFromPointer(clientX: number, clientY: number) {
    const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;

    if (!target) {
        dropSlot.value = null;
        return;
    }

    const slot = target.closest<HTMLElement>("[data-drop-slot]");

    if (slot?.dataset.tierId && slot.dataset.index) {
        dropSlot.value = {
            tierId: slot.dataset.tierId,
            index: Number.parseInt(slot.dataset.index, 10),
        };
        return;
    }

    const card = target.closest<HTMLElement>("[data-card-id]");

    if (card?.dataset.tierId && card.dataset.index) {
        const rect = card.getBoundingClientRect();
        const index = Number.parseInt(card.dataset.index, 10);
        dropSlot.value = {
            tierId: card.dataset.tierId,
            index: clientX < rect.left + rect.width / 2 ? index : index + 1,
        };
        return;
    }

    const track = target.closest<HTMLElement>("[data-tier-track]");

    if (track?.dataset.tierId && track.dataset.count) {
        dropSlot.value = {
            tierId: track.dataset.tierId,
            index: Number.parseInt(track.dataset.count, 10),
        };
        return;
    }

    dropSlot.value = null;
}

function isActiveSlot(tierId: string, index: number) {
    return dropSlot.value?.tierId === tierId && dropSlot.value.index === index;
}

function moveCard(cardId: string, targetTierId: string, rawTargetIndex: number) {
    const source = getCardLocation(cardId);
    const targetTier = tiers.value.find((tier) => tier.id === targetTierId);

    if (!source || !targetTier) {
        return;
    }

    let targetIndex = rawTargetIndex;

    if (source.tier.id === targetTierId && source.index < targetIndex) {
        targetIndex -= 1;
    }

    const [card] = source.tier.cards.splice(source.index, 1);
    targetTier.cards.splice(targetIndex, 0, card);
    printCardState(card.id);
}

function nextCardId() {
    const maxId = tiers.value
        .flatMap((tier) => tier.cards)
        .map((card) => Number.parseInt(card.id.replace("card-", ""), 10))
        .filter((value) => Number.isFinite(value))
        .reduce((max, value) => Math.max(max, value), 0);

    return `card-${maxId + 1}`;
}

function addCard() {
    const label = newCardLabel.value.trim();
    const mainIndexName = newCardMainIndexName.value.trim();

    if (!label || !mainIndexName || !poolTier.value) {
        return;
    }

    poolTier.value.cards.push({
        id: nextCardId(),
        label,
        mainIndexName,
    });

    isAddCardDialogOpen.value = false;
}

function requestDeleteCard(card: TierCard) {
    deleteTarget.value = card;
    isDeleteDialogOpen.value = true;
}

function deleteCardFromPool() {
    if (!deleteTarget.value || !poolTier.value) {
        return;
    }

    const targetIndex = poolTier.value.cards.findIndex(
        (card) => card.id === deleteTarget.value?.id,
    );

    if (targetIndex === -1) {
        isDeleteDialogOpen.value = false;
        return;
    }

    poolTier.value.cards.splice(targetIndex, 1);

    if (lastMove.value?.id === deleteTarget.value.id) {
        lastMove.value = null;
    }

    isDeleteDialogOpen.value = false;
}
</script>

<template>
    <Dialog v-model:open="isAddCardDialogOpen">
        <main class="min-h-screen bg-background text-foreground">
            <div class="mx-auto flex max-w-6xl flex-col gap-2 p-3">
                <div
                    class="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                >
                    <div class="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge variant="secondary">Tierlist</Badge>
                        <Badge variant="outline">{{ cardState.length }}</Badge>
                        <Badge variant="outline">
                            {{ poolTier?.cards.length ?? 0 }} pool
                        </Badge>
                        <p
                            v-if="lastMove"
                            class="truncate text-xs text-muted-foreground"
                        >
                            {{ lastMove.mainIndexName }} /
                            {{ lastMove.category }} /
                            #{{ lastMove.flexOrder }}
                        </p>
                        <p v-else class="text-xs text-muted-foreground">
                            Drag to print state
                        </p>
                    </div>

                    <div class="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            @click="$theme.toggle()"
                        >
                            Theme
                        </Button>
                        <DialogTrigger as-child>
                            <Button size="sm">Add</Button>
                        </DialogTrigger>
                    </div>
                </div>

                <section class="grid gap-1.5">
                    <div
                        v-for="tier in tiers"
                        :key="tier.id"
                        class="rounded-md border p-1"
                        :class="{ 'border-primary/40': dropSlot?.tierId === tier.id }"
                    >
                        <div class="flex gap-2">
                            <div
                                class="flex h-24 w-24 shrink-0 items-center justify-center rounded-md border text-center"
                                :style="{
                                    borderColor: tier.color,
                                    backgroundColor: `${tier.color}80`,
                                }"
                            >
                                <span class="text-lg font-semibold leading-none">
                                    {{ tier.label }}
                                </span>
                            </div>

                            <div class="w-full overflow-x-auto rounded-md border bg-muted/15">
                                <div
                                    class="tier-track flex h-24 w-max min-w-full items-stretch gap-1.5 p-1.5"
                                    :class="{ 'is-dragging': isDragging }"
                                    data-tier-track="true"
                                    :data-tier-id="tier.id"
                                    :data-count="tier.cards.length"
                                >
                                    <template v-if="isDragging">
                                        <div
                                            class="drop-slot"
                                            :class="{
                                                active: isActiveSlot(tier.id, 0),
                                                empty: tier.cards.length === 0,
                                            }"
                                            data-drop-slot="true"
                                            :data-tier-id="tier.id"
                                            data-index="0"
                                        >
                                            <span v-if="isActiveSlot(tier.id, 0)">
                                                #1
                                            </span>
                                        </div>
                                    </template>

                                    <template
                                        v-for="(card, index) in tier.cards"
                                        :key="card.id"
                                    >
                                        <div
                                            class="card-tile group relative flex h-full w-24 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-md border bg-card text-center shadow-none active:cursor-grabbing"
                                            :class="{
                                                'opacity-20': draggingCardId === card.id,
                                            }"
                                            :data-card-id="card.id"
                                            :data-tier-id="tier.id"
                                            :data-index="index"
                                            @pointerdown="beginDrag(card, $event)"
                                        >
                                            <button
                                                v-if="tier.id === 'pool'"
                                                type="button"
                                                class="absolute right-1 top-1 z-10 hidden h-5 w-5 items-center justify-center rounded-sm text-muted-foreground group-hover:flex hover:text-foreground"
                                                data-delete-button="true"
                                                @pointerdown.stop.prevent
                                                @click.stop="requestDeleteCard(card)"
                                            >
                                                <X class="size-3" />
                                                <span class="sr-only">
                                                    Delete {{ card.label }}
                                                </span>
                                            </button>

                                            <span
                                                class="block w-full truncate px-2 text-center text-sm font-medium"
                                            >
                                                {{ card.label }}
                                            </span>
                                        </div>

                                        <template v-if="isDragging">
                                            <div
                                                class="drop-slot"
                                                :class="{
                                                    active: isActiveSlot(
                                                        tier.id,
                                                        index + 1,
                                                    ),
                                                }"
                                                data-drop-slot="true"
                                                :data-tier-id="tier.id"
                                                :data-index="index + 1"
                                            >
                                                <span
                                                    v-if="
                                                        isActiveSlot(
                                                            tier.id,
                                                            index + 1,
                                                        )
                                                    "
                                                >
                                                    #{{ index + 2 }}
                                                </span>
                                            </div>
                                        </template>
                                    </template>

                                    <div
                                        v-if="tier.cards.length === 0 && !isDragging"
                                        class="flex h-full min-w-[96px] flex-1 items-center justify-center rounded-md border border-dashed text-[11px] text-muted-foreground"
                                    >
                                        Drop here
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <div v-if="dragState" class="drag-layer">
                <div
                    class="drag-card"
                    :style="{
                        width: `${dragState.width}px`,
                        height: `${dragState.height}px`,
                        transform: `translate(${dragState.x}px, ${dragState.y}px)`,
                    }"
                >
                    <span class="block w-full truncate px-2 text-center text-sm font-medium">
                        {{ dragState.label }}
                    </span>
                </div>
            </div>
        </main>

        <DialogContent class="sm:max-w-sm">
            <DialogHeader>
                <DialogTitle>Add card</DialogTitle>
                <DialogDescription>Add a card to the pool.</DialogDescription>
            </DialogHeader>

            <form class="grid gap-3" @submit.prevent="addCard">
                <Input v-model="newCardLabel" placeholder="Label" />
                <Input
                    v-model="newCardMainIndexName"
                    placeholder="Main index"
                />

                <DialogFooter class="gap-2 sm:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        @click="isAddCardDialogOpen = false"
                    >
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="!canAddCard">Add</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>

    <Dialog v-model:open="isDeleteDialogOpen">
        <DialogContent class="sm:max-w-sm">
            <DialogHeader>
                <DialogTitle>Delete card?</DialogTitle>
                <DialogDescription>
                    Remove
                    <span class="font-medium text-foreground">
                        {{ deleteTarget?.label }}
                    </span>
                    from the pool.
                </DialogDescription>
            </DialogHeader>

            <DialogFooter class="gap-2 sm:justify-end">
                <Button
                    type="button"
                    variant="outline"
                    @click="isDeleteDialogOpen = false"
                >
                    Cancel
                </Button>
                <Button type="button" @click="deleteCardFromPool">
                    Delete
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<style scoped>
.tier-track {
    align-items: stretch;
}

.tier-track.is-dragging .drop-slot {
    opacity: 0.55;
}

.drop-slot {
    position: relative;
    display: grid;
    height: 100%;
    flex: 0 0 14px;
    place-items: center;
    align-self: stretch;
    opacity: 0;
    transition:
        flex-basis 120ms ease,
        opacity 120ms ease;
}

.drop-slot::before {
    content: "";
    width: 2px;
    height: calc(100% - 16px);
    border-radius: 999px;
    background: color-mix(in srgb, var(--border) 88%, transparent);
}

.drop-slot.empty {
    min-width: 72px;
    flex-basis: 72px;
    opacity: 1;
    border-radius: calc(var(--radius) - 2px);
    border: 1px dashed var(--border);
    background: color-mix(in srgb, var(--muted) 50%, var(--background));
}

.drop-slot.empty::before {
    display: none;
}

.drop-slot.active {
    flex-basis: 24px;
    opacity: 1;
}

.drop-slot.active::before {
    background: var(--primary);
}

.drop-slot.empty.active {
    flex-basis: 72px;
    border-color: color-mix(in srgb, var(--primary) 46%, var(--border));
    background: color-mix(in srgb, var(--primary) 8%, var(--background));
}

.drop-slot span {
    position: absolute;
    top: 5px;
    left: 50%;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 16px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--background);
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
}

.drag-layer {
    position: fixed;
    inset: 0;
    z-index: 50;
    pointer-events: none;
}

.drag-card {
    position: fixed;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) - 2px);
    background: color-mix(in srgb, var(--background) 92%, transparent);
    box-shadow: 0 12px 32px color-mix(in srgb, black 18%, transparent);
    opacity: 0.95;
}

@media (max-width: 768px) {
    .drop-slot.empty,
    .drop-slot.empty.active {
        min-width: 56px;
        flex-basis: 56px;
    }
}
</style>
