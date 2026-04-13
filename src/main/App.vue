<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { SlickItem, SlickList } from "vue-slicksort";
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
    id?: string;
    label?: string;
    default?: boolean;
    color: string;
    cards: TierCard[];
};

type CardState = {
    id: string;
    mainIndexName: string;
    category: string;
    flexOrder: number;
};

type SortStartEvent = {
    index: number;
};

type SortEndEvent = {
    oldIndex: number;
    newIndex: number;
};

type SortInsertEvent = {
    value: TierCard;
};

const tierGroup = "tiers";

const tiers = ref<TierRow[]>([
    { id: "s", label: "S", color: "#ef4444", cards: [] },
    { id: "a", label: "A", color: "#f97316", cards: [] },
    { id: "b", label: "B", color: "#f59e0b", cards: [] },
    { id: "c", label: "C", color: "#22c55e", cards: [] },
    { id: "d", label: "D", color: "#176935", cards: [] },
    {
        id: "f",
        label: "F",
        color: "#64748b",
        cards: [
            { id: "card-1", mainIndexName: "IDX-001", label: "Apple" },
            { id: "card-2", mainIndexName: "IDX-002", label: "Banana" },
            { id: "card-3", mainIndexName: "IDX-003", label: "Cherry" },
            { id: "card-4", mainIndexName: "IDX-004", label: "Date" },
        ],
    },
]);

const draggedCardId = ref<string | null>(null);
const pendingPrintCardId = ref<string | null>(null);
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

const lastMoveText = computed(() =>
    lastMove.value
        ? `${lastMove.value.mainIndexName} / ${lastMove.value.category} / #${lastMove.value.flexOrder}`
        : "Drag to print state",
);

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

function findTier(tierId: string) {
    return tiers.value.find((tier) => tier.id === tierId) ?? null;
}

function findCardState(cardId: string) {
    return cardState.value.find((row) => row.id === cardId) ?? null;
}

function printCardState(cardId: string) {
    lastMove.value = findCardState(cardId);
    console.log("card state:", lastMove.value);
    console.table(cardState.value);
}

function tierLabelStyle(tier: TierRow) {
    return {
        borderColor: tier.color,
        backgroundColor: `${tier.color}80`,
    };
}

function flushPendingPrint(nextCards: TierCard[]) {
    const cardId = pendingPrintCardId.value;

    if (!cardId || !nextCards.some((card) => card.id === cardId)) {
        return;
    }

    nextTick(() => {
        printCardState(cardId);
        pendingPrintCardId.value = null;
        draggedCardId.value = null;
    });
}

function updateTierCards(tierId: string, nextCards: TierCard[]) {
    const tier = findTier(tierId);

    if (!tier) {
        return;
    }

    tier.cards = nextCards;
    flushPendingPrint(nextCards);
}

function handleSortStart(tierId: string, event: SortStartEvent) {
    const tier = findTier(tierId);

    draggedCardId.value = tier?.cards[event.index]?.id ?? null;
    pendingPrintCardId.value = null;
}

function handleSortEnd(event: SortEndEvent) {
    if (!draggedCardId.value) {
        return;
    }

    if (event.oldIndex === event.newIndex) {
        draggedCardId.value = null;
        pendingPrintCardId.value = null;
        return;
    }

    pendingPrintCardId.value = draggedCardId.value;
}

function handleSortInsert(event: SortInsertEvent) {
    pendingPrintCardId.value = event.value?.id ?? draggedCardId.value;
}

function handleSortCancel() {
    draggedCardId.value = null;
    pendingPrintCardId.value = null;
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
    <main class="page">
        <div class="shell">
            <header class="toolbar">
                <div class="toolbar__meta">
                    <Badge variant="secondary">Tierlist</Badge>
                    <Badge variant="outline">{{ cardState.length }}</Badge>
                    <Badge variant="outline"
                        >{{ poolTier?.cards.length ?? 0 }} pool</Badge
                    >
                    <p class="toolbar__status">{{ lastMoveText }}</p>
                </div>

                <Dialog v-model:open="isAddCardDialogOpen">
                    <DialogTrigger as-child>
                        <Button size="sm">Add</Button>
                    </DialogTrigger>

                    <DialogContent class="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Add card</DialogTitle>
                            <DialogDescription
                                >Add a card to the pool.</DialogDescription
                            >
                        </DialogHeader>

                        <form class="dialog-form" @submit.prevent="addCard">
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
                                <Button type="submit" :disabled="!canAddCard">
                                    Add
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </header>

            <section class="board">
                <div
                    v-for="tier in tiers"
                    :key="tier.id"
                    class="tier-row min-w-full"
                >
                    <div class="tier-label" :style="tierLabelStyle(tier)">
                        <span class="tier-label__name">{{ tier.label }}</span>
                    </div>

                    <SlickList
                        class="tier-list min-w-full"
                        :class="{ 'is-empty': tier.cards.length === 0 }"
                        tag="div"
                        :list="tier.cards"
                        :group="tierGroup"
                        axis="x"
                        :distance="6"
                        :transition-duration="180"
                        :dragged-settling-duration="160"
                        helper-class="tier-card-helper"
                        append-to="body"
                        @sort-start="handleSortStart(tier.id, $event)"
                        @sort-end="handleSortEnd($event)"
                        @sort-insert="handleSortInsert($event)"
                        @sort-cancel="handleSortCancel"
                        @update:list="updateTierCards(tier.id, $event)"
                    >
                        <SlickItem
                            v-for="(card, index) in tier.cards"
                            :key="card.id"
                            :index="index"
                            class="tier-item"
                            tag="div"
                        >
                            <article class="tier-card">
                                <button
                                    v-if="tier.id === 'pool'"
                                    type="button"
                                    class="pool-delete"
                                    @click.stop="requestDeleteCard(card)"
                                >
                                    <X class="size-3" />
                                    <span class="sr-only"
                                        >Delete {{ card.label }}</span
                                    >
                                </button>

                                <span class="tier-card__label">
                                    {{ card.label }}
                                </span>
                            </article>
                        </SlickItem>
                    </SlickList>
                </div>
            </section>
        </div>
    </main>

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
.page {
    min-height: 100vh;
    background: var(--background);
    color: var(--foreground);
}

.shell {
    width: min(100%, 72rem);
    margin: 0 auto;
    padding: 0.75rem;
    display: grid;
    gap: 0.5rem;
}

.toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) + 2px);
    background: color-mix(in srgb, var(--background) 92%, var(--muted));
}

.toolbar__meta {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.toolbar__status {
    min-width: 0;
    margin: 0;
    font-size: 0.75rem;
    color: var(--muted-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dialog-form {
    display: grid;
    gap: 0.75rem;
}

.board {
    display: grid;
    gap: 0.5rem;
}

.tier-row {
    display: grid;
    grid-template-columns: 5rem minmax(0, 1fr);
    gap: 0.5rem;
    align-items: stretch;
    padding: 0.2rem;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) + 2px);
    background: color-mix(in srgb, var(--background) 94%, var(--muted));
}

.tier-label {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 4.5rem;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) + 1px);
    text-align: center;
}

.tier-label__count {
    position: absolute;
    top: 0.375rem;
    right: 0.375rem;
    min-width: 1.625rem;
    height: 1.625rem;
    padding: 0 0.35rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: color-mix(in srgb, var(--background) 82%, var(--muted));
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1;
}

.tier-label__name {
    font-size: 1.85rem;
    font-weight: 700;
    line-height: 1;
}

.tier-list {
    min-width: 0;
    min-height: 4.5rem;
    display: flex;
    align-items: stretch;
    gap: 0.5rem;
    padding: 0.2rem;
    overflow-x: auto;
    overflow-y: hidden;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) + 1px);
    background: color-mix(in srgb, var(--muted) 28%, transparent);
    scrollbar-width: thin;
}

.tier-list.is-empty {
    justify-content: flex-start;
}

.tier-item {
    flex: 0 0 auto;
    display: flex;
    height: 100%;
}

.tier-card {
    position: relative;
    width: 7.25rem;
    min-height: 100%;
    display: grid;
    place-items: center;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--background) 94%, var(--muted));
    color: var(--foreground);
    user-select: none;
    cursor: grab;
}

.tier-card:active {
    cursor: grabbing;
}

.tier-card__label {
    width: 100%;
    padding: 0 1.5rem;
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.1;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.pool-delete {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    z-index: 1;
    width: 1.25rem;
    height: 1.25rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--muted-foreground);
    opacity: 0;
    pointer-events: none;
    transition:
        opacity 120ms ease,
        color 120ms ease;
}

.tier-card:hover .pool-delete,
.pool-delete:focus-visible {
    opacity: 1;
    pointer-events: auto;
}

.pool-delete:hover {
    color: var(--foreground);
}

.tier-empty {
    flex: 1 0 7.25rem;
    min-width: 7.25rem;
    min-height: 3.5rem;
    display: grid;
    place-items: center;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    color: var(--muted-foreground);
    font-size: 0.75rem;
    pointer-events: none;
}

:global(.tier-card-helper) {
    z-index: 60;
    box-shadow: 0 14px 30px color-mix(in srgb, black 16%, transparent);
}

@media (max-width: 700px) {
    .shell {
        padding: 0.5rem;
    }

    .toolbar {
        align-items: stretch;
        flex-direction: column;
    }

    .toolbar__status {
        width: 100%;
    }

    .tier-row {
        grid-template-columns: 4rem minmax(0, 1fr);
        gap: 0.375rem;
        padding: 0.375rem;
    }

    .tier-label,
    .tier-list {
        min-height: 4rem;
    }

    .tier-label__name {
        font-size: 1.5rem;
    }

    .tier-card {
        width: 6.5rem;
        min-height: 3.25rem;
    }

    .tier-empty {
        min-width: 6.5rem;
        min-height: 3.25rem;
    }
}
</style>
