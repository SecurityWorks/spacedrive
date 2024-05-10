import { Cloud, Devices } from '@phosphor-icons/react/dist/ssr';
import * as RDialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import { useState } from 'react';
import { ExplorerItem, useBridgeMutation, useDiscoveredPeers, useZodForm } from '@sd/client';
import { Button, Dialog, Divider, Tooltip, useDialog, UseDialogProps, z } from '@sd/ui';
import { Icon } from '~/components';
import { useLocale } from '~/hooks';
import { usePlatform } from '~/util/Platform';

import { Image } from '../Explorer/FilePath/Image';
import { useExplorerItemData } from '../Explorer/useExplorerItemData';

interface SpacedropDialogProps extends UseDialogProps {
	items: ExplorerItem[];
}

function getSpacedropItems(items: ExplorerItem[]) {
	// only return paths
	return items.filter((item) => item.type === 'Path');
}

// TODO: Handle multiple items, we wanna show user a list and let them select which items to spacedrop
// TODO: Error handling for Spacedrop Cloud (e.g. file too big)
// TODO: Weird component structure, too many states, components and logic. Maybe refactor?
export default function SpacedropDialog({ items, ...props }: SpacedropDialogProps) {
	const dialog = useDialog(props);
	const { t } = useLocale();

	// destination name (cloud or peer name)
	const [destination, setDestination] = useState<string>('cloud');
	// dialog page state (0: pick items/p2p spacedrop, 1: cloud spacedrop config, 2: cloud spacedrop progress/url)
	const [page, setPage] = useState<number>(0);

	// this form is for Cloud option
	const form = useZodForm({
		schema: z.object({
			password: z.string().optional(),
			expiry: z.date().optional()
		})
	});

	const p2pSpacedrop = useBridgeMutation('p2p.spacedrop');

	function handleSendFile() {
		console.log('destination', destination);
		if (destination === 'cloud') {
			// handle cloud spacedrop
		} else {
			// handle p2p spacedrop
			// p2pSpacedrop({ destination, items });
		}
		// temp
		dialog.close();
	}

	return (
		<Dialog form={useZodForm({})} dialog={dialog} hideButtons>
			{/* Header */}
			<div className="flex w-full flex-col items-center space-y-2 p-4">
				<div className="flex flex-row items-center gap-2">
					<Icon name="Spacedrop" size={36} />
					<span className="text-lg font-bold">Spacedrop</span>
				</div>
				<p className="text-balance text-center text-sm text-ink-dull">
					{t('spacedrop_description')}
				</p>
			</div>
			<Divider />
			{/* Content */}
			{page === 0 && (
				<SpacedropHome
					items={items}
					destination={destination}
					setDestination={setDestination}
				/>
			)}
			{page === 1 && <SpacedropCloudConfig />}
			{page === 2 && <SpacedropCloud />}
			{/* Buttons */}
			<div className="mt-4 flex items-center justify-end space-x-2">
				<RDialog.Close asChild>
					<Button size="sm" variant="gray" onClick={() => dialog.close()}>
						{t('cancel')}
					</Button>
				</RDialog.Close>
				{destination === 'cloud' && page === 0 ? (
					<Button variant="accent" onClick={() => setPage((p) => p + 1)}>
						Next
					</Button>
				) : (
					<Button variant="accent" onClick={handleSendFile}>
						Send
					</Button>
				)}
			</div>
		</Dialog>
	);
}

function NodeItem(props: {
	name: string;
	icon: JSX.Element;
	isSelected: boolean;
	onClick: () => void;
}) {
	return (
		<div
			className={clsx(
				'relative flex items-center gap-2 rounded-md border bg-app-darkBox px-3 py-2 text-ink',
				props.isSelected ? 'border-accent' : 'border-app-line'
			)}
			onClick={props.onClick}
		>
			{props.isSelected && (
				<div className="absolute right-4 size-1.5 rounded-full bg-accent" />
			)}
			{props.icon}
			<span className="text-sm text-gray-200">{props.name}</span>
		</div>
	);
}

function BasicFileItem(props: { data: ExplorerItem }) {
	const itemData = useExplorerItemData(props.data);
	const platform = usePlatform();

	return (
		<div className="relative flex flex-col items-center justify-center overflow-hidden text-center text-xs text-gray-400">
			{itemData.hasLocalThumbnail ? (
				<Image
					src={platform.getThumbnailUrlByThumbKey(itemData.thumbnailKey)}
					size={{ height: 24, width: 24 }}
					className="rounded-md"
				/>
			) : (
				// TODO: Make it display what the explorer shows for the file type
				<Icon name="Document" size={64} />
			)}
			<Tooltip asChild label={itemData.fullName}>
				<span className="mt-2 truncate text-wrap">{itemData.fullName}</span>
			</Tooltip>
			<span className="mt-1">{itemData.size.toString()}</span>
		</div>
	);
}

function SpacedropHome(props: {
	items: ExplorerItem[];
	destination: string;
	setDestination: (destination: string) => void;
}) {
	const { destination, setDestination, items } = props;

	const { t } = useLocale();

	const discoveredPeers = useDiscoveredPeers();

	const [spacedropItems, setSpacedropItems] = useState(getSpacedropItems(items));

	return spacedropItems.length > 1 ? (
		<SpacedropPickItems />
	) : spacedropItems.length === 1 ? (
		<div className="grid grid-cols-3 space-x-4 py-4">
			<div className="col-span-2 border-r border-app-line/60 pr-4">
				<div className="space-y-2">
					{Array.from(discoveredPeers).map(([id, meta]) => (
						<NodeItem
							key={id}
							icon={<Devices size={16} />}
							name={meta.metadata.name}
							isSelected={destination === meta.metadata.name}
							onClick={() => setDestination(meta.metadata.name)}
						/>
					))}
					<NodeItem
						icon={<Cloud size={16} />}
						name={t('spacedrive_cloud')}
						isSelected={destination === 'cloud'}
						onClick={() => setDestination('cloud')}
					/>
				</div>
			</div>
			{spacedropItems.map((item, index) => (
				<BasicFileItem data={item} key={index} />
			))}
		</div>
	) : (
		<div className="flex h-32 items-center justify-center">
			<p className="text-gray-200">{t('nothing_selected')}</p>
		</div>
	);
}

/** Where we show the items and let the user pick which ones to spacedrop.
 * This will be removed once Spacedrop supports multiple items in a clean way.
 */
function SpacedropPickItems() {
	return <div>Pick items</div>;
}

/** The config for the cloud spacedrop (password etc.) */
function SpacedropCloudConfig() {
	return <div>Cloud Config</div>;
}

/** Where we show the uploading progress & url after it's done */
function SpacedropCloud() {
	return <div></div>;
}