<script setup lang="ts">
import "./App.css";
import { computed, nextTick, ref, watch } from "vue";
import { SlickItem, SlickList } from "vue-slicksort";
import { Trash2, SunMoon } from "lucide-vue-next";
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
    label: string;
};

type TierRow = {
    id: string;
    label: string;
    labelClass: string;
    cards: TierCard[];
};

type CardState = {
    id: string;
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
    { id: "s", label: "S", labelClass: "tier-label--s", cards: [] },
    { id: "a", label: "A", labelClass: "tier-label--a", cards: [] },
    { id: "b", label: "B", labelClass: "tier-label--b", cards: [] },
    { id: "c", label: "C", labelClass: "tier-label--c", cards: [] },
    { id: "d", label: "D", labelClass: "tier-label--d", cards: [] },
    {
        id: "f",
        label: "F",
        labelClass: "tier-label--f",
        cards: [
            { id: "card-1", label: "Apple" },
            { id: "card-2", label: "Banana" },
            { id: "card-3", label: "Cherry" },
            { id: "card-4", label: "Date" },
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

const cardState = computed<CardState[]>(() =>
    tiers.value.flatMap((tier) =>
        tier.cards.map((card, index) => ({
            id: card.id,
            category: tier.label,
            flexOrder: index + 1,
        })),
    ),
);

const poolTier = computed(
    () => tiers.value.find((tier) => tier.id === "f") ?? null,
);

const canAddCard = computed(() => newCardLabel.value.trim().length > 0);

watch(isAddCardDialogOpen, (open) => {
    if (!open) {
        newCardLabel.value = "";
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

function flushPendingPrint(card: TierCard | undefined) {
    if (!card) {
        return;
    }

    nextTick(() => {
        printCardState(card.id);
        pendingPrintCardId.value = null;
        draggedCardId.value = null;
    });
}

function updateTierCards(tierId: string, nextCards: TierCard[]) {
    const tier = findTier(tierId);

    const id = pendingPrintCardId.value;
    const card = nextCards.find((card) => card.id === id);

    if (!tier) {
        return;
    }

    tier.cards = nextCards;
    flushPendingPrint(card);
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

    if (!label || !poolTier.value) {
        return;
    }

    poolTier.value.cards.push({
        id: nextCardId(),
        label,
    });

    isAddCardDialogOpen.value = false;
}

function requestDeleteCard(card: TierCard) {
    deleteTarget.value = card;
    isDeleteDialogOpen.value = true;
}

function deleteCardFromPool() {
    if (!deleteTarget.value) {
        return;
    }

    tiers.value.forEach((data) => {
        const targetIndex = data.cards.findIndex(
            (card) => card.id === deleteTarget.value?.id,
        );

        if (targetIndex !== -1) {
            data.cards.splice(targetIndex, 1);
        }
    });

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
                </div>

                <Button
                    @click="$theme.toggle"
                    class="fixed right-2 bottom-2"
                    size="icon"
                    variant="ghost"
                >
                    <SunMoon />
                </Button>

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
                    <div :class="['tier-label', tier.labelClass]">
                        <span class="tier-label__name select-none">{{
                            tier.label
                        }}</span>
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
                        <template #default>
                            <SlickItem
                                v-for="(card, index) in tier.cards"
                                :key="card.id"
                                :index="index"
                                class="w-auto h-auto"
                                tag="div"
                            >
                                <div class="tier-card group">
                                    <button
                                        type="button"
                                        class="absolute top-1 right-1 z-10 inline-flex size-5 items-center justify-center rounded-full text-destructive opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto"
                                        aria-label="Delete card"
                                        @click.stop="requestDeleteCard(card)"
                                    >
                                        <Trash2 class="size-3" />
                                    </button>

                                    <span class="tier-card__label">
                                        {{ card.label }}
                                    </span>
                                </div>
                            </SlickItem>
                        </template>

                        <template #fallback>
                            <div class="tier-card group">
                                <span class="tier-card__label">Loading</span>
                            </div>
                        </template>
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
