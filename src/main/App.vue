<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { X } from "lucide-vue-next";
import { Badge } from "@/main/components/ui/badge";
import { Button } from "@/main/components/ui/button";
import { Card, CardContent } from "@/main/components/ui/card";
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
import { ScrollArea, ScrollBar } from "@/main/components/ui/scroll-area";

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
const isDragging = computed(() => draggingCardId.value !== null);

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

function findTierByCardId(cardId: string) {
    return tiers.value.find((tier) =>
        tier.cards.some((card) => card.id === cardId),
    );
}

function findCardState(cardId: string) {
    return cardState.value.find((row) => row.id === cardId) ?? null;
}

function printCardState(cardId: string) {
    lastMove.value = findCardState(cardId);
    console.log("card state:", lastMove.value);
    console.table(cardState.value);
}

function startDrag(cardId: string, event: DragEvent) {
    draggingCardId.value = cardId;
    event.dataTransfer?.setData("text/plain", cardId);

    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
    }
}

function endDrag() {
    draggingCardId.value = null;
    dropSlot.value = null;
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

function setDropSlot(targetTierId: string, rawIndex: number) {
    if (!draggingCardId.value) {
        return;
    }

    dropSlot.value = { tierId: targetTierId, index: rawIndex };
}

function isActiveSlot(tierId: string, index: number) {
    return dropSlot.value?.tierId === tierId && dropSlot.value.index === index;
}

function moveCard(targetTierId: string, rawTargetIndex: number) {
    if (!draggingCardId.value) {
        return;
    }

    const source = getCardLocation(draggingCardId.value);
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
    endDrag();
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
                <div>
                    <CardContent
                        class="flex flex-wrap items-center justify-between gap-2 p-3 h-fit"
                    >
                        <div class="flex min-w-0 flex-wrap items-center gap-2">
                            <Badge variant="secondary">Tierlist</Badge>
                            <Badge variant="outline">
                                {{ cardState.length }}
                            </Badge>
                            <Badge variant="outline">
                                {{ poolTier?.cards.length ?? 0 }} pool
                            </Badge>
                            <p
                                v-if="lastMove"
                                class="truncate text-xs text-muted-foreground"
                            >
                                {{ lastMove.mainIndexName }} /
                                {{ lastMove.category }} / #{{
                                    lastMove.flexOrder
                                }}
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
                    </CardContent>
                </div>

                <section class="grid">
                    <div
                        v-for="tier in tiers"
                        :key="tier.id"
                        class="transition-colors"
                        :class="{
                            'border-primary/40': dropSlot?.tierId === tier.id,
                        }"
                    >
                        <CardContent class="p-0.5">
                            <div class="flex gap-2">
                                <div
                                    class="flex h-18 w-18 flex-col items-center justify-center rounded-md border px-2 py-2"
                                    :style="{
                                        borderColor: tier.color,
                                        backgroundColor: `${tier.color}50`,
                                    }"
                                >
                                    <span
                                        class="text-lg font-semibold leading-none"
                                    >
                                        {{ tier.label }}
                                    </span>
                                </div>

                                <ScrollArea
                                    class="rounded-md border bg-muted/15 h-full w-full"
                                >
                                    <div
                                        class="tier-track flex h-18 w-max min-w-full items-stretch gap-1.5 p-1.5"
                                        :class="{ 'is-dragging': isDragging }"
                                        @dragover.prevent.self="
                                            setDropSlot(
                                                tier.id,
                                                tier.cards.length,
                                            )
                                        "
                                        @drop.prevent.self="
                                            moveCard(tier.id, tier.cards.length)
                                        "
                                    >
                                        <div
                                            class="drop-slot"
                                            :class="{
                                                active: isActiveSlot(
                                                    tier.id,
                                                    0,
                                                ),
                                                empty: tier.cards.length === 0,
                                            }"
                                            @dragover.prevent.stop="
                                                setDropSlot(tier.id, 0)
                                            "
                                            @drop.prevent.stop="
                                                moveCard(tier.id, 0)
                                            "
                                            v-show="draggingCardId !== null"
                                        >
                                            <span
                                                v-if="isActiveSlot(tier.id, 0)"
                                            >
                                                #1
                                            </span>
                                        </div>

                                        <template
                                            v-for="(card, index) in tier.cards"
                                            :key="card.id"
                                        >
                                            <Card
                                                class="card-tile group relative h-full w-18 items-center justify-center shrink-0 rounded-md border bg-card shadow-none"
                                                :class="{
                                                    'opacity-40':
                                                        draggingCardId ===
                                                        card.id,
                                                }"
                                                draggable="true"
                                                @dragover.prevent.stop="
                                                    setDropSlot(
                                                        tier.id,
                                                        index + 1,
                                                    )
                                                "
                                                @drop.prevent.stop="
                                                    moveCard(tier.id, index + 1)
                                                "
                                                @dragstart="
                                                    startDrag(card.id, $event)
                                                "
                                                @dragend="endDrag"
                                            >
                                                <Button
                                                    v-if="tier.id === 'pool'"
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    class="absolute right-1 top-1 z-10 h-5 w-5 rounded-sm opacity-0 transition-opacity group-hover:opacity-100"
                                                    draggable="false"
                                                    @pointerdown.stop.prevent
                                                    @click.stop="
                                                        requestDeleteCard(card)
                                                    "
                                                >
                                                    <X class="size-3" />
                                                    <span class="sr-only">
                                                        Delete {{ card.label }}
                                                    </span>
                                                </Button>

                                                <CardContent
                                                    class="flex h-full flex-col gap-2 p-2.5"
                                                >
                                                    <div
                                                        class="flex h-full items-center"
                                                    >
                                                        <p
                                                            class="truncate text-sm font-medium"
                                                        >
                                                            {{ card.label }}
                                                        </p>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <div
                                                class="drop-slot"
                                                :class="{
                                                    active: isActiveSlot(
                                                        tier.id,
                                                        index + 1,
                                                    ),
                                                }"
                                                @dragover.prevent.stop="
                                                    setDropSlot(
                                                        tier.id,
                                                        index + 1,
                                                    )
                                                "
                                                @drop.prevent.stop="
                                                    moveCard(tier.id, index + 1)
                                                "
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

                                        <div
                                            v-if="
                                                tier.cards.length === 0 &&
                                                !draggingCardId
                                            "
                                            class="flex h-full min-w-[96px] flex-1 items-center justify-center rounded-md border border-dashed text-[11px] text-muted-foreground"
                                        >
                                            Drop here
                                        </div>
                                    </div>

                                    <ScrollBar
                                        orientation="horizontal"
                                        class="px-1.5 pb-1.5"
                                    />
                                </ScrollArea>
                            </div>
                        </CardContent>
                    </div>
                </section>
            </div>
        </main>

        <DialogContent class="sm:max-w-sm">
            <DialogHeader>
                <DialogTitle>Add card</DialogTitle>
                <DialogDescription> Add a card to the pool. </DialogDescription>
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
                    <Button type="submit" :disabled="!canAddCard"> Add </Button>
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
    opacity: 0.45;
}

.drop-slot {
    position: relative;
    display: grid;
    height: 100%;
    flex: 0 0 10px;
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
    flex-basis: 20px;
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

@media (max-width: 768px) {
    .drop-slot.empty,
    .drop-slot.empty.active {
        min-width: 56px;
        flex-basis: 56px;
    }
}
</style>
